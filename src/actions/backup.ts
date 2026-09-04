"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { exigirAcesso } from "@/lib/sessao";
import { registrar } from "@/lib/auditoria";
import { t } from "@/lib/i18n";
import {
  validarBackup,
  conferirReferencias,
  contar,
  reidratar,
  ORDEM_INSERCAO,
  ORDEM_EXCLUSAO,
  ROTULOS,
  type Backup,
  type DadosBackup,
  type Registro,
} from "@/lib/backup";

export type PreviewBackup = {
  arquivo: string;
  geradoEm: string;
  versao: number;
  /** O que existe no arquivo. */
  entrando: Record<string, number>;
  /** O que já existe no banco hoje. */
  atual: Record<string, number>;
  avisos: string[];
  problemas: string[];
  /** Serializado — o cliente devolve isto no passo 2 sem reabrir o arquivo. */
  conteudo: string;
};

/**
 * O backup percorre as 12 tabelas em laço, e é aí que o TypeScript reclama.
 *
 * Cada delegate do Prisma (`prisma.socio`, `prisma.transacao`, ...) tem métodos
 * genéricos com tipos de argumento próprios. Indexar um mapa desses delegates
 * produz uma UNIÃO de assinaturas genéricas, e o TS recusa chamar união de
 * genéricos: "This expression is not callable."
 *
 * A saída é olhar o delegate pela forma que realmente usamos aqui — contar,
 * listar, criar e apagar — em vez de pelo tipo completo do modelo. O cast fica
 * num lugar só, com o motivo escrito, em vez de espalhado por `as any`.
 *
 * O preço: dentro deste arquivo o Prisma não valida os campos do `data`. É
 * aceitável porque o conteúdo vem de um backup gerado pelo próprio schema e
 * `validarBackup` já barrou o que estivesse fora do formato.
 */
type DelegateGenerico = {
  count(args?: object): Promise<number>;
  findMany(args?: object): Promise<Registro[]>;
  create(args: { data: Registro }): Promise<unknown>;
  deleteMany(args?: object): Promise<{ count: number }>;
};

/** Nome do model no client Prisma para cada seção do backup. */
const MODEL: Record<keyof DadosBackup, string> = {
  config: "config",
  faixasSimples: "faixaSimples",
  socios: "socio",
  clientes: "cliente",
  categorias: "categoria",
  caixinhas: "caixinha",
  recorrentes: "recorrente",
  importacoes: "importacao",
  transacoes: "transacao",
  impostos: "imposto",
  distribuicoes: "distribuicao",
  movimentosCaixinha: "movimentoCaixinha",
  auditoria: "auditoria",
};

/**
 * Resolve o delegate a partir da seção. Serve tanto para o `prisma` global
 * quanto para o cliente transacional (`tx`), que expõe os mesmos models.
 */
function delegateDe(
  cliente: unknown,
  secao: keyof DadosBackup
): DelegateGenerico {
  return (cliente as Record<string, DelegateGenerico>)[MODEL[secao]];
}

async function contagemAtual(): Promise<Record<string, number>> {
  const pares = await Promise.all(
    ORDEM_INSERCAO.map(
      async (k) => [k, await delegateDe(prisma, k).count()] as const
    )
  );
  return Object.fromEntries(pares);
}

/**
 * Passo 1 — lê e valida o arquivo. NÃO toca no banco.
 *
 * Restaurar é a operação mais destrutiva do sistema; o preview existe para você
 * ver exatamente o que entra e o que já está lá antes de decidir.
 */
export async function analisarBackup(fd: FormData): Promise<PreviewBackup> {
  const sessao = await exigirAcesso();
  const arquivo = fd.get("arquivo") as File | null;
  if (!arquivo || arquivo.size === 0) {
    throw new Error(t.errors.selecioneBackupJson);
  }

  const texto = await arquivo.text();

  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    throw new Error(t.errors.arquivoNaoJson);
  }

  const v = validarBackup(bruto);
  if (!v.ok) throw new Error(v.erro);

  const problemas = conferirReferencias(v.backup.dados);
  const atual = await contagemAtual();

  return {
    arquivo: arquivo.name,
    geradoEm: v.backup.financeops.geradoEm,
    versao: v.backup.financeops.versao,
    entrando: contar(v.backup.dados),
    atual,
    avisos: v.avisos,
    problemas,
    conteudo: JSON.stringify(v.backup),
  };
}

export type ModoRestauracao = "SUBSTITUIR" | "MESCLAR";

/**
 * Passo 2 — grava.
 *
 * SUBSTITUIR: apaga tudo e recria o banco do arquivo. É o modo de restauração
 *   de verdade — o resultado é idêntico ao original, IDs inclusive.
 *
 * MESCLAR: só insere o que ainda não existe (por id). Serve para trazer de volta
 *   registros perdidos sem desfazer o que foi lançado depois. Não atualiza o que
 *   já está lá: sobrescrever silenciosamente um lançamento editado seria pior do
 *   que deixá-lo como está.
 *
 * Tudo acontece numa transação só. Se qualquer linha falhar, nada é gravado —
 * um banco pela metade seria pior do que o estado anterior.
 */
export async function restaurarBackup(conteudo: string, modo: ModoRestauracao) {
  const sessao = await exigirAcesso();
  const v = validarBackup(JSON.parse(conteudo));
  if (!v.ok) throw new Error(v.erro);

  const dados = v.backup.dados;
  const problemas = conferirReferencias(dados);
  if (problemas.length > 0) {
    throw new Error(t.errors.backupInconsistente(problemas.join(" ")));
  }

  const inseridos: Record<string, number> = {};
  const pulados: Record<string, number> = {};

  await prisma.$transaction(
    async (tx) => {
      const delegate = (k: keyof DadosBackup) => delegateDe(tx, k);

      if (modo === "SUBSTITUIR") {
        // Ordem inversa da inserção: filho antes do pai, senão a FK barra.
        for (const k of ORDEM_EXCLUSAO) {
          await delegate(k).deleteMany({});
        }
      }

      for (const k of ORDEM_INSERCAO) {
        const lista = (dados[k] ?? []) as Registro[];
        if (lista.length === 0) {
          inseridos[k] = 0;
          pulados[k] = 0;
          continue;
        }

        let existentes = new Set<string>();
        if (modo === "MESCLAR") {
          const chave = k === "config" ? "chave" : "id";
          const atuais = (await delegate(k).findMany({
            select: { [chave]: true },
          })) as Registro[];
          existentes = new Set(atuais.map((r) => String(r[chave])));
        }

        let n = 0;
        let p = 0;
        for (const registro of lista) {
          const chave = k === "config" ? "chave" : "id";
          if (existentes.has(String(registro[chave]))) {
            p++;
            continue;
          }
          // Transações têm auto-referência (origemId). Inserimos sem ela e
          // costuramos depois, senão a ordem entre irmãs passa a importar.
          const dado =
            k === "transacoes" ? { ...reidratar(registro), origemId: null } : reidratar(registro);
          await delegate(k).create({ data: dado });
          n++;
        }
        inseridos[k] = n;
        pulados[k] = p;
      }

      // Segunda passada: agora todas as transações existem.
      const comOrigem = (dados.transacoes ?? []).filter((t) => t.origemId);
      for (const t of comOrigem) {
        await tx.transacao.update({
          where: { id: t.id as string },
          data: { origemId: t.origemId as string },
        });
      }
    },
    // Restaurar centenas de linhas uma a uma leva mais que o timeout padrão.
    { timeout: 120_000, maxWait: 20_000 }
  );

  for (const p of [
    "/",
    "/transacoes",
    "/impostos",
    "/caixinhas",
    "/recorrentes",
    "/configuracoes",
    "/importar",
  ]) {
    revalidatePath(p);
  }

  const total = Object.values(inseridos).reduce((s, n) => s + n, 0);
  const totalPulado = Object.values(pulados).reduce((s, n) => s + n, 0);

  // Restauração é a operação mais destrutiva do sistema. Fica registrada mesmo
  // no modo SUBSTITUIR, que apaga tudo — inclusive a auditoria anterior. Esta
  // linha nasce depois do apagamento, então sobrevive e conta o que houve.
  await registrar(sessao, {
    acao: "RESTAURAR",
    entidade: "BACKUP",
    resumo:
      modo === "SUBSTITUIR"
        ? `Substituiu o banco inteiro por um backup (${total} registros)`
        : `Mesclou um backup: ${total} inseridos, ${totalPulado} mantidos`,
  });

  return {
    modo,
    total,
    totalPulado,
    detalhe: ORDEM_INSERCAO.map((k) => ({
      tabela: ROTULOS[k],
      inseridos: inseridos[k] ?? 0,
      pulados: pulados[k] ?? 0,
    })).filter((d) => d.inseridos > 0 || d.pulados > 0),
  };
}

