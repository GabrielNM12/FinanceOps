/**
 * Rotas que não exigem sessão.
 *
 * Vive num módulo sem dependência nenhuma de propósito: é consumido pelo
 * middleware (runtime Edge) e por componentes de cliente.
 */

/** Telas que existem justamente para quem ainda não entrou. */
export const ROTAS_PUBLICAS = ["/login"];

/**
 * `/entrar` é o próprio consumo do link do e-mail — bloqueá-lo por falta de
 * sessão criaria um ciclo: para entrar seria preciso já estar dentro.
 *
 * `/api/v1` é a API de integração, cuja autenticação é o Bearer token
 * (INTEGRACAO.md, seção 7): um sistema consumindo dados não tem cookie.
 */
export const PREFIXOS_LIVRES = ["/entrar", "/api/v1"];

/**
 * Mensagem única para sessão perdida.
 *
 * As server actions lançam exatamente este texto, e o cliente compara por ele
 * para saber que precisa mandar a pessoa ao login. Comparar por string é frágil
 * — por isso a string mora aqui, num só lugar, em vez de repetida em 38 arquivos.
 */
export const MSG_SESSAO_EXPIRADA =
  "Sessão expirada ou acesso revogado. Entre novamente.";

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
  const url = new URL("/login", window.location.origin);
  if (destino && destino !== "/") url.searchParams.set("destino", destino);
  if (motivo) url.searchParams.set("erro", "sessao_expirada");

  window.location.href = url.toString();
}
