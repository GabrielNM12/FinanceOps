"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { parseCentavos, parseBps, aplicarBps } from "@/lib/money";
import { deInputDate, competenciaDe, vencimentoDAS } from "@/lib/datas";
import { calcularAliquota, diaVencimentoDAS } from "@/lib/simples";
import { exigirAcesso } from "@/lib/sessao";
import { registrar } from "@/lib/auditoria";
import { t } from "@/lib/i18n";

function revalidarTudo() {
  for (const p of ["/", "/transacoes", "/impostos", "/configuracoes"]) {
    revalidatePath(p);
  }
}

const texto = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const opcional = (fd: FormData, k: string) => texto(fd, k) || null;

// ---------------------------------------------------------------------------
// RECEITA DE PROJETO (o fluxo principal)
// ---------------------------------------------------------------------------

/**
 * Registra a receita e PROVISIONA o imposto no mesmo ato, dentro de uma
 * transação de banco. Provisionar depois, num segundo passo, seria a origem
 * garantida de receita sem imposto no relatório.
 *
 * O imposto nasce PROVISIONADO: reduz o lucro e o caixa livre, mas ainda não
 * é saída de caixa. Vira saída quando a guia é paga, em /impostos.
 */
export async function registrarReceita(fd: FormData) {
  const sessao = await exigirAcesso();
  const valorBruto = parseCentavos(texto(fd, "valor"));
  if (valorBruto <= 0) throw new Error(t.errors.valorMaiorQueZero);

  const dataCompetencia = deInputDate(texto(fd, "dataCompetencia"));
  const dataCaixaRaw = opcional(fd, "dataCaixa");

  const semImposto = fd.get("semImposto") === "on";

  // Se o usuário editou o valor do imposto na tela, respeitamos o que ele
  // digitou. O cálculo automático é sugestão, não camisa de força.
  const impostoManual = opcional(fd, "impostoValor");
  const aliquotaManual = opcional(fd, "impostoAliquota");

  let impostoCentavos = 0;
  let aliquotaBps: number | null = null;
  let anexo: string | null = null;
  let rbt12: number | null = null;

  if (!semImposto) {
    const calc = await calcularAliquota(dataCompetencia);
    anexo = calc.anexo;
    rbt12 = calc.rbt12Centavos;
    aliquotaBps = aliquotaManual ? parseBps(aliquotaManual) : calc.aliquotaBps;

    impostoCentavos = impostoManual
      ? parseCentavos(impostoManual)
      : aplicarBps(valorBruto, aliquotaBps);

    if (impostoCentavos < 0) throw new Error(t.errors.impostoNegativo);
    if (impostoCentavos > valorBruto) {
      throw new Error(t.errors.impostoMaiorQueBruto);
    }
  }

  const dia = await diaVencimentoDAS();
  let receitaId = "";

  await prisma.$transaction(async (tx) => {
    const receita = await tx.transacao.create({
      data: {
        criadoPorId: sessao.socio?.id ?? null,
        tipo: "ENTRADA",
        descricao: texto(fd, "descricao"),
        valorCentavos: valorBruto,
        dataCompetencia,
        dataCaixa: dataCaixaRaw ? deInputDate(dataCaixaRaw) : null,
        clienteId: opcional(fd, "clienteId"),
        categoriaId: opcional(fd, "categoriaId"),
        observacoes: opcional(fd, "observacoes"),
      },
    });

    receitaId = receita.id;

    if (impostoCentavos > 0) {
      await tx.imposto.create({
        data: {
          receitaId: receita.id,
          tipo: "DAS",
          aliquotaBps,
          valorCentavos: impostoCentavos,
          anexo,
          rbt12Centavos: rbt12,
          status: "PROVISIONADO",
          vencimento: vencimentoDAS(dataCompetencia, dia),
        },
      });
    }
  });

  await registrar(sessao, {
    acao: "CRIAR",
    entidade: "LANCAMENTO",
    entidadeId: receitaId,
    resumo: `Receita "${texto(fd, "descricao")}"${
      impostoCentavos > 0 ? ` (imposto provisionado ${impostoCentavos / 100})` : ""
    }`,
    valorCentavos: valorBruto,
  });

  revalidarTudo();
}

/** Prévia do imposto para a tela de lançamento, antes de salvar. */
export async function previewImposto(valorTexto: string, dataTexto: string) {
  const sessao = await exigirAcesso();
  try {
    const valor = parseCentavos(valorTexto);
    const data = deInputDate(dataTexto);
    const calc = await calcularAliquota(data);
    const imposto = aplicarBps(valor, calc.aliquotaBps);
    return {
      ok: true as const,
      aliquotaBps: calc.aliquotaBps,
      anexo: calc.anexo,
      faixa: calc.faixa,
      rbt12Centavos: calc.rbt12Centavos,
      impostoCentavos: imposto,
      liquidoCentavos: valor - imposto,
      aviso: calc.aviso ?? null,
    };
  } catch (e) {
    return { ok: false as const, erro: (e as Error).message };
  }
}

// ---------------------------------------------------------------------------
// DESPESA
// ---------------------------------------------------------------------------

export async function registrarDespesa(fd: FormData) {
  const sessao = await exigirAcesso();
  const valor = parseCentavos(texto(fd, "valor"));
  if (valor <= 0) throw new Error(t.errors.valorMaiorQueZero);

  const dataCaixaRaw = opcional(fd, "dataCaixa");

  const despesa = await prisma.transacao.create({
    data: {
      criadoPorId: sessao.socio?.id ?? null,
      tipo: "SAIDA",
      descricao: texto(fd, "descricao"),
      valorCentavos: valor,
      dataCompetencia: deInputDate(texto(fd, "dataCompetencia")),
      dataCaixa: dataCaixaRaw ? deInputDate(dataCaixaRaw) : null,
      categoriaId: opcional(fd, "categoriaId"),
      clienteId: opcional(fd, "clienteId"),
      // Preenchido quando um sócio pagou do próprio bolso. Vira base de reembolso.
      socioId: opcional(fd, "socioId"),
      observacoes: opcional(fd, "observacoes"),
    },
  });

  await registrar(sessao, {
    acao: "CRIAR",
    entidade: "LANCAMENTO",
    entidadeId: despesa.id,
    resumo: `Despesa "${texto(fd, "descricao")}"`,
    valorCentavos: valor,
  });

  revalidarTudo();
}

// ---------------------------------------------------------------------------
// DISTRIBUIÇÃO / PRÓ-LABORE / REEMBOLSO
// ---------------------------------------------------------------------------

/**
 * Cria a movimentação e o registro de distribuição juntos.
 *
 * A natureza importa muito:
 *   LUCRO       -> não é despesa; não entra no Fator R.
 *   PRO_LABORE  -> é despesa; ENTRA no Fator R (pode te levar ao Anexo III).
 *   REEMBOLSO   -> não é despesa (a despesa já foi lançada); só move caixa.
 */
export async function registrarDistribuicao(fd: FormData) {
  const sessao = await exigirAcesso();
  const valor = parseCentavos(texto(fd, "valor"));
  if (valor <= 0) throw new Error(t.errors.valorMaiorQueZero);

  const socioId = texto(fd, "socioId");
  if (!socioId) throw new Error(t.errors.selecioneSocio);

  const natureza = texto(fd, "natureza") || "LUCRO";
  const dataCompetencia = deInputDate(texto(fd, "dataCompetencia"));
  const dataCaixaRaw = opcional(fd, "dataCaixa");

  const socio = await prisma.socio.findUnique({ where: { id: socioId } });
  let idCriado = "";

  await prisma.$transaction(async (tx) => {
    const lanc = await tx.transacao.create({
      data: {
        criadoPorId: sessao.socio?.id ?? null,
        tipo: "DISTRIBUICAO",
        descricao:
          texto(fd, "descricao") ||
          t.generated.comSocio(
            natureza === "PRO_LABORE"
              ? t.generated.proLabore
              : natureza === "REEMBOLSO"
                ? t.generated.reembolso
                : t.generated.distribuicaoLucros,
            socio?.nome ?? ""
          ),
        valorCentavos: valor,
        dataCompetencia,
        dataCaixa: dataCaixaRaw ? deInputDate(dataCaixaRaw) : null,
        socioId,
        observacoes: opcional(fd, "observacoes"),
      },
    });

    await tx.distribuicao.create({
      data: {
        transacaoId: lanc.id,
        socioId,
        natureza,
        valorCentavos: valor,
        competencia: competenciaDe(dataCompetencia),
      },
    });

    idCriado = lanc.id;
  });

  await registrar(sessao, {
    acao: "CRIAR",
    entidade: "LANCAMENTO",
    entidadeId: idCriado,
    resumo: `${
      natureza === "PRO_LABORE"
        ? "Pró-labore"
        : natureza === "REEMBOLSO"
          ? "Reembolso"
          : "Distribuição de lucros"
    } para ${socio?.nome ?? "sócio"}`,
    valorCentavos: valor,
  });

  revalidarTudo();
}

/** Aporte de capital pelo sócio — entra no caixa, mas não é receita. */
export async function registrarAporte(fd: FormData) {
  const sessao = await exigirAcesso();
  const valor = parseCentavos(texto(fd, "valor"));
  if (valor <= 0) throw new Error(t.errors.valorMaiorQueZero);

  const aporte = await prisma.transacao.create({
    data: {
      criadoPorId: sessao.socio?.id ?? null,
      tipo: "APORTE",
      descricao: texto(fd, "descricao") || t.generated.aporteCapital,
      valorCentavos: valor,
      dataCompetencia: deInputDate(texto(fd, "dataCompetencia")),
      dataCaixa: deInputDate(texto(fd, "dataCaixa") || texto(fd, "dataCompetencia")),
      socioId: opcional(fd, "socioId"),
    },
  });

  await registrar(sessao, {
    acao: "CRIAR",
    entidade: "LANCAMENTO",
    entidadeId: aporte.id,
    resumo: `Aporte de capital`,
    valorCentavos: valor,
  });

  revalidarTudo();
}

// ---------------------------------------------------------------------------
// Manutenção
// ---------------------------------------------------------------------------

/** Marca como pago/recebido hoje — o gesto mais frequente do dia a dia. */
export async function confirmarCaixa(id: string, data?: string) {
  const sessao = await exigirAcesso();
  const lanc = await prisma.transacao.update({
    where: { id },
    data: { dataCaixa: data ? deInputDate(data) : new Date() },
  });

  await registrar(sessao, {
    acao: "CONFIRMAR",
    entidade: "LANCAMENTO",
    entidadeId: id,
    resumo: `Marcou "${lanc.descricao}" como liquidado`,
    valorCentavos: lanc.valorCentavos,
  });

  revalidarTudo();
}

export async function desfazerCaixa(id: string) {
  const sessao = await exigirAcesso();
  const lanc = await prisma.transacao.update({
    where: { id },
    data: { dataCaixa: null },
  });

  await registrar(sessao, {
    acao: "DESFAZER",
    entidade: "LANCAMENTO",
    entidadeId: id,
    resumo: `Voltou "${lanc.descricao}" para pendente`,
    valorCentavos: lanc.valorCentavos,
  });

  revalidarTudo();
}

export async function excluirTransacao(id: string) {
  const sessao = await exigirAcesso();
  // Impostos caem junto (onDelete: Cascade). Se a receita já teve a guia paga,
  // bloqueamos: apagar aqui deixaria uma saída de caixa órfã no extrato.
  const paga = await prisma.imposto.findFirst({
    where: { receitaId: id, status: "PAGO" },
  });
  if (paga) {
    throw new Error(t.errors.receitaComImpostoPago);
  }

  // Lê ANTES de apagar: depois do delete não há mais o que descrever, e uma
  // exclusão sem registro é justamente o evento que mais precisa de trilha.
  const lanc = await prisma.transacao.findUnique({ where: { id } });

  await prisma.transacao.delete({ where: { id } });

  await registrar(sessao, {
    acao: "EXCLUIR",
    entidade: "LANCAMENTO",
    entidadeId: id,
    resumo: `Excluiu "${lanc?.descricao ?? id}"`,
    valorCentavos: lanc?.valorCentavos ?? null,
  });

  revalidarTudo();
}
