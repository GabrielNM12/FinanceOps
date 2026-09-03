/**
 * A URL pública do app, do ponto de vista de quem usa o navegador.
 *
 * POR QUE ISTO EXISTE (e por que `req.url` não serve):
 *
 * Com `output: standalone`, o Next escuta em `0.0.0.0:3000` dentro do
 * container. Nesse mundo, `req.url` é literalmente `http://0.0.0.0:3000/...` —
 * é o endereço do socket, não o endereço que o usuário digitou. Um
 * `NextResponse.redirect(new URL("/", req.url))` manda o navegador para
 * `http://0.0.0.0:3000/`, que no computador de quem clicou não existe.
 *
 * O sintoma é traiçoeiro: o e-mail chega, o link está certo, o token é
 * consumido com sucesso — e o navegador termina numa página que não carrega.
 * Tudo funcionou, menos o último passo.
 *
 * A ordem de preferência abaixo é deliberada:
 *
 *   1. `APP_URL` — a única fonte que não depende de o proxy estar bem
 *      configurado. Em produção é o que deve mandar.
 *   2. `x-forwarded-host` / `x-forwarded-proto` — o que o proxy reverso
 *      informa. Cobre quem sobe atrás de um Caddy/nginx sem definir APP_URL.
 *   3. `host` — o desenvolvimento local, sem proxy nenhum.
 *
 * Nunca `req.url`.
 */

/** Hosts que denunciam o socket interno em vez do endereço público. */
const HOSTS_INTERNOS = ["0.0.0.0", "[::]", "::"];

function ehInterno(host: string): boolean {
  const semPorta = host.replace(/:\d+$/, "");
  return HOSTS_INTERNOS.includes(semPorta);
}

/**
 * Núcleo puro, para poder ser testado sem levantar um servidor.
 *
 * @param appUrl valor de `process.env.APP_URL`, se houver
 * @param ler    devolve o cabeçalho pedido, ou null
 */
export function montarUrlBase(
  appUrl: string | undefined,
  ler: (nome: string) => string | null
): string {
  if (appUrl) return appUrl.replace(/\/$/, "");

  const encaminhado = ler("x-forwarded-host");
  const direto = ler("host");
  // Um `host` interno é pior que nenhum: gera uma URL que parece válida e não
  // abre. Preferimos o fallback explícito de localhost, que ao menos é honesto
  // sobre ser desenvolvimento.
  const host =
    encaminhado ?? (direto && !ehInterno(direto) ? direto : null) ?? "localhost:3000";

  const proto =
    ler("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");

  return `${proto}://${host}`;
}

/** Versão para quem tem um `Headers` em mãos (route handlers, server actions). */
export function urlPublica(headers: {
  get(nome: string): string | null;
}): string {
  return montarUrlBase(process.env.APP_URL, (n) => headers.get(n));
}
