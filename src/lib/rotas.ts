/**
 * Rotas que não exigem sessão + tradução de caminhos por locale.
 *
 * Vive num módulo sem dependência nenhuma de propósito: é consumido pelo
 * middleware (runtime Edge) e por componentes de cliente. Lê
 * `process.env.NEXT_PUBLIC_APP_LOCALE` direto em vez de importar `@/lib/i18n`
 * para não arrastar os dicionários inteiros para o bundle Edge.
 *
 * Os caminhos em português são as PASTAS reais do App Router. Quando o locale é
 * `en`, o `next.config.mjs` reescreve os caminhos em inglês para essas pastas
 * (rewrites) e redireciona os caminhos em português para o inglês (redirects).
 * O middleware roda ANTES dos rewrites, então enxerga o caminho em inglês — por
 * isso as listas abaixo já saem localizadas.
 */

const EN = process.env.NEXT_PUBLIC_APP_LOCALE === "en";

const PT_PATHS = {
  home: "/",
  login: "/login",
  entrar: "/entrar",
  transacoes: "/transacoes",
  impostos: "/impostos",
  caixinhas: "/caixinhas",
  recorrentes: "/recorrentes",
  importar: "/importar",
  auditoria: "/auditoria",
  configuracoes: "/configuracoes",
};

const EN_OVERRIDES = {
  transacoes: "/transactions",
  impostos: "/taxes",
  caixinhas: "/reserves",
  recorrentes: "/recurring",
  importar: "/import",
  auditoria: "/audit",
  configuracoes: "/settings",
};

export type RotaKey = keyof typeof PT_PATHS;

/** Pares [caminho em inglês, pasta em português] — usado pelo next.config. */
export const MAPA_ROTAS_EN: [string, string][] = Object.entries(EN_OVERRIDES).map(
  ([k, en]) => [en, PT_PATHS[k as RotaKey]]
);

/** Caminho público de uma rota lógica, no locale corrente do build. */
export function pathFor(en: boolean, k: RotaKey): string {
  return en && k in EN_OVERRIDES ? EN_OVERRIDES[k as keyof typeof EN_OVERRIDES] : PT_PATHS[k];
}

export const PATHS: Record<RotaKey, string> = Object.fromEntries(
  (Object.keys(PT_PATHS) as RotaKey[]).map((k) => [k, pathFor(EN, k)])
) as Record<RotaKey, string>;

export function rota(k: RotaKey): string {
  return PATHS[k];
}

/** Telas que existem justamente para quem ainda não entrou. */
export const ROTAS_PUBLICAS = [PATHS.login];

/**
 * `/entrar` é o próprio consumo do link do e-mail — bloqueá-lo por falta de
 * sessão criaria um ciclo. `/api/v1` é a API de integração (Bearer token).
 * Nenhum dos dois é traduzido.
 */
export const PREFIXOS_LIVRES = [PATHS.entrar, "/api/v1"];

/**
 * Mensagem única para sessão perdida. As server actions lançam exatamente este
 * texto e o cliente compara por ele. Fica aqui (e não em `@/lib/i18n`) pelo
 * mesmo motivo de bundle do resto do módulo.
 */
export const MSG_SESSAO_EXPIRADA = EN
  ? "Session expired or access revoked. Sign in again."
  : "Sessão expirada ou acesso revogado. Entre novamente.";

/**
 * Manda para o login guardando de onde a pessoa veio.
 *
 * Navegação completa em vez de `router.push` de propósito: a sessão acabou de
 * ser invalidada e há estado obsoleto em memória — recarregar é mais barato do
 * que garantir que nada ficou para trás.
 */
export function irParaLogin(motivo?: "expirou") {
  if (typeof window === "undefined") return;

  const destino = window.location.pathname + window.location.search;
  const url = new URL(PATHS.login, window.location.origin);
  if (destino && destino !== "/") url.searchParams.set("destino", destino);
  if (motivo) url.searchParams.set("erro", "sessao_expirada");

  window.location.href = url.toString();
}
