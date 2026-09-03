"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { prepararImportacao, LinhaPreview } from "@/lib/csv";
import { vencimentoDAS } from "@/lib/datas";
import { calcularAliquota, diaVencimentoDAS } from "@/lib/simples";
import { aplicarBps } from "@/lib/money";
import { competenciaDe } from "@/lib/datas";
import { exigirAcesso } from "@/lib/sessao";
import { registrar } from "@/lib/auditoria";

/** Normaliza nome para casar sócio sem tropeçar em acento ou caixa. */
function chaveNome(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export type PreviewImportacao = {
  arquivo: string;
  colunasReconhecidas: string[];
  colunasFaltando: string[];
  linhas: (Omit<LinhaPreview, "data" | "dataCaixa"> & {
    data: string | null;
    dataCaixa: string | null;
    duplicada: boolean;
  })[];
  resumo: { total: number; validas: number; comErro: number; duplicadas: number };
};

/**
 * Passo 1 — lê o arquivo e devolve o preview. NÃO grava nada.
 *
 * Importação de extrato bancário é a operação mais perigosa do sistema: um
 * arquivo errado polui meses de histórico. Por isso é sempre em dois passos,
 * sem exceção.
 */
export async function analisarCSV(fd: FormData): Promise<PreviewImportacao> {
  const sessao = await exigirAcesso();
  const arquivo = fd.get("arquivo") as File | null;
  if (!arquivo || arquivo.size === 0) throw new Error("Selecione um arquivo CSV.");

  const texto = await arquivo.text();
  const { cabecalho, mapa, linhas } = prepararImportacao(texto);

  if (mapa.data === undefined || mapa.valor === undefined) {
    throw new Error(
      `O arquivo precisa ter ao menos as colunas "data" e "valor". ` +
        `Colunas encontradas: ${cabecalho.join(", ") || "(nenhuma)"}.`
    );
  }

  // Uma consulta só para todos os hashes — evita N queries no preview.
  const hashes = linhas.map((l) => l.hash);
  const existentes = await prisma.transacao.findMany({
    where: { hashImportacao: { in: hashes } },
    select: { hashImportacao: true },
  });
  const jaImportados = new Set(existentes.map((e) => e.hashImportacao));

  // Sócio é cadastro sensível: nunca criado automaticamente. Um nome digitado
  // errado viraria um sétimo sócio silencioso e estragaria o rateio.
  const socios = await prisma.socio.findMany({ select: { nome: true } });
  const conhecidos = new Map(socios.map((s) => [chaveNome(s.nome), s.nome]));

  const saida = linhas.map((l) => {
    let erro = l.erro;
    if (!erro && l.socio && !conhecidos.has(chaveNome(l.socio))) {
      erro = `Sócio "${l.socio}" não cadastrado. Adicione em Configurações → Sócios.`;
    }
    return {
      ...l,
      erro,
      data: l.data ? l.data.toISOString() : null,
      dataCaixa: l.dataCaixa ? l.dataCaixa.toISOString() : null,
      duplicada: jaImportados.has(l.hash),
    };
  });

  return {
    arquivo: arquivo.name,
    colunasReconhecidas: Object.keys(mapa),
    colunasFaltando: ["data", "descricao", "valor"].filter(
      (c) => !(c in mapa)
    ),
    linhas: saida,
    resumo: {
      total: saida.length,
      validas: saida.filter((l) => !l.erro && !l.duplicada).length,
      comErro: saida.filter((l) => l.erro).length,
      duplicadas: saida.filter((l) => l.duplicada).length,
    },
  };
}

/**
 * Passo 2 — grava as linhas aprovadas.
 *
 * Linhas com erro e duplicadas são puladas silenciosamente (já foram mostradas
 * no preview). Categorias e clientes citados por nome são criados na hora —
 * exigir cadastro prévio tornaria a importação inútil na prática.
 *
 * Receitas importadas provisionam DAS automaticamente, igual ao lançamento
 * manual. Sem isso, importar o extrato criaria um mês inteiro de receita sem
 * imposto.
 */
export async function confirmarImportacao(
  arquivo: string,
  linhas: PreviewImportacao["linhas"],
  opcoes: { provisionarImposto: boolean } = { provisionarImposto: true }
) {
  const sessao = await exigirAcesso();
  const aprovadas = linhas.filter((l) => !l.erro && !l.duplicada && l.data);
  if (aprovadas.length === 0) throw new Error("Nenhuma linha válida para importar.");

  const dia = await diaVencimentoDAS();

  // Resolve categorias e clientes antes do laço principal.
  const nomesCategoria = [...new Set(aprovadas.map((l) => l.categoria).filter(Boolean))] as string[];
  const nomesCliente = [...new Set(aprovadas.map((l) => l.cliente).filter(Boolean))] as string[];

  const mapaCategoria = new Map<string, string>();
  for (const nome of nomesCategoria) {
    const c = await prisma.categoria.upsert({
      where: { nome },
      update: {},
      create: { nome, natureza: "SAIDA" },
    });
    mapaCategoria.set(nome, c.id);
  }

  const mapaCliente = new Map<string, string>();
  for (const nome of nomesCliente) {
    const existente = await prisma.cliente.findFirst({ where: { nome } });
    const p = existente ?? (await prisma.cliente.create({ data: { nome } }));
    mapaCliente.set(nome, p.id);
  }

  // Sócios já foram validados no preview: aqui só resolvemos o id.
  const socios = await prisma.socio.findMany({ select: { id: true, nome: true } });
  const mapaSocio = new Map(socios.map((s) => [chaveNome(s.nome), s.id]));

  const importacao = await prisma.importacao.create({
    data: {
      arquivo,
      linhasTotal: linhas.length,
      linhasImportadas: 0,
      linhasIgnoradas: linhas.length - aprovadas.length,
    },
  });

  let gravadas = 0;

  for (const l of aprovadas) {
    const dataCompetencia = new Date(l.data!);

    const socioId = l.socio ? mapaSocio.get(chaveNome(l.socio)) ?? null : null;

    try {
      await prisma.$transaction(async (tx) => {
        const t = await tx.transacao.create({
          data: {
            criadoPorId: sessao.socio?.id ?? null,
            tipo: l.tipo,
            descricao: l.descricao,
            valorCentavos: l.valorCentavos,
            dataCompetencia,
            // null aqui é intencional: o preview já decidiu se a linha está
            // liquidada. Cair para dataCompetencia marcaria como pago algo que
            // o usuário deixou explicitamente em aberto.
            dataCaixa: l.dataCaixa ? new Date(l.dataCaixa) : null,
            categoriaId: l.categoria ? mapaCategoria.get(l.categoria) ?? null : null,
            clienteId: l.cliente ? mapaCliente.get(l.cliente) ?? null : null,
            socioId,
            observacoes: l.observacoes,
            hashImportacao: l.hash,
            importacaoId: importacao.id,
          },
        });

        // DISTRIBUICAO precisa da linha em fin_distribuicao — é ela que
        // alimenta o painel de sócios e o Fator R. Sem isso a transação
        // existiria, mas ninguém saberia que fulano recebeu.
        if (l.tipo === "DISTRIBUICAO" && socioId) {
          await tx.distribuicao.create({
            data: {
              transacaoId: t.id,
              socioId,
              natureza: l.natureza ?? "LUCRO",
              valorCentavos: l.valorCentavos,
              competencia: competenciaDe(dataCompetencia),
            },
          });
        }

        if (l.tipo === "ENTRADA" && opcoes.provisionarImposto) {
          const calc = await calcularAliquota(dataCompetencia);
          const valor = aplicarBps(l.valorCentavos, calc.aliquotaBps);
          if (valor > 0) {
            await tx.imposto.create({
              data: {
                receitaId: t.id,
                tipo: "DAS",
                aliquotaBps: calc.aliquotaBps,
                valorCentavos: valor,
                anexo: calc.anexo,
                rbt12Centavos: calc.rbt12Centavos,
                vencimento: vencimentoDAS(dataCompetencia, dia),
              },
            });
          }
        }
      });
      gravadas++;
    } catch (e) {
      // Corrida com a unique de hash: outra importação simultânea gravou a
      // mesma linha. Ignorar é o comportamento certo — o registro existe.
      const msg = (e as Error).message;
      if (!msg.includes("Unique constraint")) throw e;
    }
  }

  await prisma.importacao.update({
    where: { id: importacao.id },
    data: { linhasImportadas: gravadas, linhasIgnoradas: linhas.length - gravadas },
  });

  await registrar(sessao, {
    acao: "IMPORTAR",
    entidade: "LANCAMENTO",
    entidadeId: importacao.id,
    resumo: `Importou ${gravadas} lançamento(s) de "${arquivo}"`,
    valorCentavos: aprovadas.reduce((s2, l) => s2 + l.valorCentavos, 0),
  });

  for (const p of ["/", "/transacoes", "/importar", "/impostos"]) revalidatePath(p);

  return { importadas: gravadas, ignoradas: linhas.length - gravadas };
}
