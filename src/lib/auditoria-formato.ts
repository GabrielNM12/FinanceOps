/**
 * Rótulos e cores da auditoria — puro, sem Prisma.
 *
 * Separado de `auditoria.ts` por dois motivos concretos:
 *
 * 1. A tela `/auditoria` é client component. Importar o módulo que instancia o
 *    Prisma arrastaria o client do banco para o bundle do navegador.
 * 2. Os testes rodam sem banco. Uma função de formatação que exige conexão não
 *    é testável, e é justamente ela que decide o que a pessoa lê na tela.
 */

export const ACOES = [
  "CRIAR",
  "ATUALIZAR",
  "EXCLUIR",
  "CONFIRMAR",
  "DESFAZER",
  "PAGAR",
  "ESTORNAR",
  "GUARDAR",
  "RESGATAR",
  "IMPORTAR",
  "RESTAURAR",
  "ACESSO",
] as const;

export const ENTIDADES = [
  "LANCAMENTO",
  "IMPOSTO",
  "CAIXINHA",
  "SOCIO",
  "CLIENTE",
  "CATEGORIA",
  "RECORRENTE",
  "BACKUP",
  "CONFIG",
] as const;

export type Acao = (typeof ACOES)[number];
export type Entidade = (typeof ENTIDADES)[number];

export type RegistroAuditoria = {
  acao: Acao;
  entidade: Entidade;
  entidadeId?: string | null;
  resumo: string;
  valorCentavos?: number | null;
};

// ---------------------------------------------------------------------------
// Formatação — pura, para poder ser testada
// ---------------------------------------------------------------------------

const VERBOS: Record<Acao, string> = {
  CRIAR: "criou",
  ATUALIZAR: "alterou",
  EXCLUIR: "excluiu",
  CONFIRMAR: "confirmou",
  DESFAZER: "desfez",
  PAGAR: "pagou",
  ESTORNAR: "estornou",
  GUARDAR: "guardou",
  RESGATAR: "resgatou",
  IMPORTAR: "importou",
  RESTAURAR: "restaurou",
  ACESSO: "acessou",
};

const ROTULO_ENTIDADE: Record<Entidade, string> = {
  LANCAMENTO: "lançamento",
  IMPOSTO: "imposto",
  CAIXINHA: "caixinha",
  SOCIO: "sócio",
  CLIENTE: "cliente",
  CATEGORIA: "categoria",
  RECORRENTE: "recorrente",
  BACKUP: "backup",
  CONFIG: "configuração",
};

export function verboDe(acao: string): string {
  return VERBOS[acao as Acao] ?? acao.toLowerCase();
}

export function rotuloEntidade(entidade: string): string {
  return ROTULO_ENTIDADE[entidade as Entidade] ?? entidade.toLowerCase();
}

/** Cor do selo por ação. Destrutivo em vermelho, dinheiro saindo em âmbar. */
export function corDaAcao(acao: string): string {
  switch (acao) {
    case "EXCLUIR":
    case "ESTORNAR":
      return "#ef4444";
    case "PAGAR":
    case "GUARDAR":
      return "#f59e0b";
    case "CRIAR":
    case "CONFIRMAR":
      return "#16a34a";
    case "IMPORTAR":
    case "RESTAURAR":
      return "#8b5cf6";
    default:
      return "#64748b";
  }
}

/**
 * Nome de quem fez, para exibição.
 *
 * Cai para o e-mail quando não há sócio — acesso de emergência (bootstrap) ou
 * sócio removido depois do evento. Nunca fica vazio: uma linha de auditoria sem
 * autor não audita nada.
 */
export function autorDe(registro: {
  socio?: { nome: string } | null;
  email: string;
}): string {
  return registro.socio?.nome ?? registro.email;
}
