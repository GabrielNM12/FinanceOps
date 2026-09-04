/**
 * Backup completo do FinanceOps.
 *
 * POR QUE ISTO EXISTE, SE JÁ HÁ EXPORTAÇÃO EM CSV:
 *
 * O CSV de lançamentos é ótimo para abrir no Excel, mas é um backup **lossy**.
 * Ele não carrega sócios, categorias com natureza e cor, caixinhas, recorrentes,
 * faixas do Simples nem — o mais grave — as provisões de imposto com a alíquota
 * que valia na época. Reimportar o CSV recalcularia o DAS com as regras de hoje,
 * e uma guia que foi apurada a 15,92% voltaria com outro valor.
 *
 * Este formato guarda tudo, inclusive os IDs, para que restaurar produza um
 * banco idêntico ao original — não um parecido.
 */
import { t } from "@/lib/i18n";

export const VERSAO_BACKUP = 1;

export type Backup = {
  financeops: {
    versao: number;
    geradoEm: string;
    /** Só informativo, para quem abrir o arquivo no editor. */
    observacao?: string;
  };
  resumo: Record<string, number>;
  dados: DadosBackup;
};

export type DadosBackup = {
  config: Registro[];
  faixasSimples: Registro[];
  socios: Registro[];
  clientes: Registro[];
  categorias: Registro[];
  caixinhas: Registro[];
  recorrentes: Registro[];
  importacoes: Registro[];
  transacoes: Registro[];
  impostos: Registro[];
  distribuicoes: Registro[];
  movimentosCaixinha: Registro[];
  auditoria: Registro[];
};

export type Registro = Record<string, unknown>;

/**
 * Ordem de inserção. Respeita as chaves estrangeiras:
 * cadastros primeiro, ledger depois, e o que depende do ledger por último.
 *
 * `transacoes` entra antes de `impostos` e `movimentosCaixinha` porque as duas
 * apontam para ela. `socios` antes de `distribuicoes` porque a FK é Restrict.
 */
export const ORDEM_INSERCAO: (keyof DadosBackup)[] = [
  "config",
  "faixasSimples",
  "socios",
  "clientes",
  "categorias",
  "caixinhas",
  "recorrentes",
  "importacoes",
  "transacoes",
  "impostos",
  "distribuicoes",
  "movimentosCaixinha",
  // Por último: só depende de fin_socio, que entra bem antes.
  "auditoria",
];

/** Ordem de exclusão: o inverso, para nunca apagar um pai antes do filho. */
export const ORDEM_EXCLUSAO = [...ORDEM_INSERCAO].reverse();

export const ROTULOS: Record<keyof DadosBackup, string> = t.backup.rotulos;

/** Campos que são DateTime e precisam virar Date na restauração. */
export const CAMPOS_DATA = new Set([
  "criadoEm",
  "atualizadoEm",
  "dataCompetencia",
  "dataCaixa",
  "data",
  "vencimento",
  "inicio",
  "fim",
  "metaData",
  "vigenciaInicio",
  "quando",
]);

export function reidratar(registro: Registro): Registro {
  const saida: Registro = {};
  for (const [k, v] of Object.entries(registro)) {
    saida[k] =
      CAMPOS_DATA.has(k) && typeof v === "string" && v ? new Date(v) : v;
  }
  return saida;
}

// ---------------------------------------------------------------------------

export type Validacao =
  | { ok: true; backup: Backup; avisos: string[] }
  | { ok: false; erro: string };

/**
 * Valida o arquivo antes de deixar qualquer coisa tocar o banco.
 *
 * Restaurar é a operação mais destrutiva do sistema. Um arquivo truncado ou de
 * outra versão precisa ser recusado aqui, não no meio da gravação.
 */
export function validarBackup(bruto: unknown): Validacao {
  if (typeof bruto !== "object" || bruto === null) {
    return { ok: false, erro: t.backup.naoJsonValido };
  }

  const b = bruto as Partial<Backup>;

  if (!b.financeops || typeof b.financeops.versao !== "number") {
    return { ok: false, erro: t.backup.naoEhBackup };
  }

  if (b.financeops.versao > VERSAO_BACKUP) {
    return {
      ok: false,
      erro: t.backup.versaoAlta(b.financeops.versao, VERSAO_BACKUP),
    };
  }

  if (!b.dados || typeof b.dados !== "object") {
    return { ok: false, erro: t.backup.semDados };
  }

  const avisos: string[] = [];
  const dados = b.dados as Partial<DadosBackup>;

  for (const chave of ORDEM_INSERCAO) {
    const valor = dados[chave];
    if (valor === undefined) {
      // Tabela ausente é tolerável: o backup pode vir de uma versão anterior
      // que ainda não tinha aquela tabela. Vazio é diferente de corrompido.
      dados[chave] = [];
      avisos.push(t.backup.secaoAusente(ROTULOS[chave]));
      continue;
    }
    if (!Array.isArray(valor)) {
      return { ok: false, erro: t.backup.secaoNaoLista(ROTULOS[chave]) };
    }
    const semId = valor.filter(
      (r) => chave !== "config" && (!r || typeof (r as Registro).id !== "string")
    );
    if (semId.length > 0) {
      return {
        ok: false,
        erro: t.backup.registrosSemId(semId.length, ROTULOS[chave]),
      };
    }
  }

  return {
    ok: true,
    backup: { ...b, dados: dados as DadosBackup } as Backup,
    avisos,
  };
}

/** Contagem por tabela, para o preview mostrar o que vai entrar. */
export function contar(dados: DadosBackup): Record<string, number> {
  return Object.fromEntries(
    ORDEM_INSERCAO.map((k) => [k, dados[k]?.length ?? 0])
  );
}

/**
 * Confere a integridade do que está dentro do arquivo: toda FK precisa apontar
 * para um registro presente no próprio backup. Sem isso, a restauração começa,
 * quebra no meio e faz rollback — melhor descobrir antes.
 */
export function conferirReferencias(dados: DadosBackup): string[] {
  const problemas: string[] = [];
  const ids = (lista: Registro[]) => new Set(lista.map((r) => r.id as string));

  const trans = ids(dados.transacoes);
  const socios = ids(dados.socios);
  const caixinhas = ids(dados.caixinhas);

  const checar = (
    lista: Registro[],
    campo: string,
    conjunto: Set<string>,
    rotulo: string
  ) => {
    const orfaos = lista.filter((r) => {
      const v = r[campo];
      return typeof v === "string" && v && !conjunto.has(v);
    });
    if (orfaos.length > 0) {
      problemas.push(t.backup.orfaos(orfaos.length, rotulo, campo));
    }
  };

  // ID repetido dentro de uma mesma seção.
  //
  // Parece impossível num arquivo exportado pelo próprio sistema — e é. Mas
  // backup é justamente o formato que as pessoas editam à mão, mesclam de duas
  // origens ou geram por script. E o estrago é silencioso: as chaves
  // estrangeiras continuam "válidas", porque resolvem para ALGUM registro; só
  // que para o errado. Uma provisão de imposto passa a apontar para outra
  // receita e o DAS fica com o valor de outro lançamento.
  //
  // Na restauração isso viraria erro de chave única no meio da transação, com
  // metade dos dados dentro. Melhor recusar antes de começar.
  for (const secao of ORDEM_INSERCAO) {
    const lista = dados[secao];
    // `config` é chaveada por `chave`, não por `id`.
    const campo = secao === "config" ? "chave" : "id";
    const vistos = new Set<string>();
    const repetidos = new Set<string>();

    for (const r of lista) {
      const v = r[campo];
      if (typeof v !== "string" || !v) continue;
      if (vistos.has(v)) repetidos.add(v);
      vistos.add(v);
    }

    if (repetidos.size > 0) {
      const amostra = [...repetidos].slice(0, 3).join(", ");
      problemas.push(
        t.backup.repetidos(ROTULOS[secao], repetidos.size, campo, amostra, repetidos.size > 3)
      );
    }
  }

  checar(dados.impostos, "receitaId", trans, t.backup.refUmLancamento);
  checar(dados.impostos, "pagamentoId", trans, t.backup.refUmLancamento);
  checar(dados.distribuicoes, "transacaoId", trans, t.backup.refUmLancamento);
  checar(dados.distribuicoes, "socioId", socios, t.backup.refUmSocio);
  checar(dados.movimentosCaixinha, "transacaoId", trans, t.backup.refUmLancamento);
  checar(dados.movimentosCaixinha, "caixinhaId", caixinhas, t.backup.refUmaCaixinha);

  // FK que é 1:1 no schema (@unique). Dois registros com o mesmo valor passam
  // por `checar` — ambos apontam para um lançamento que existe — mas quebram a
  // unique no meio da transação, com metade dos dados já dentro. `fin_transacao`
  // tem uma distribuição e um movimento de caixinha, nunca dois.
  const unico = (lista: Registro[], campo: string, rotulo: string) => {
    const vistos = new Set<string>();
    const repetidos = new Set<string>();
    for (const r of lista) {
      const v = r[campo];
      if (typeof v !== "string" || !v) continue;
      if (vistos.has(v)) repetidos.add(v);
      vistos.add(v);
    }
    if (repetidos.size > 0) {
      const amostra = [...repetidos].slice(0, 3).join(", ");
      problemas.push(
        t.backup.dividemCampo(rotulo, repetidos.size, campo, amostra, repetidos.size > 3)
      );
    }
  };

  unico(dados.distribuicoes, "transacaoId", ROTULOS.distribuicoes);
  unico(dados.movimentosCaixinha, "transacaoId", ROTULOS.movimentosCaixinha);

  return problemas;
}
