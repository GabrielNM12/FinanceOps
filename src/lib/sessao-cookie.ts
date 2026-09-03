/**
 * Cookie de sessão assinado.
 *
 * Formato: `base64url(payload).base64url(HMAC-SHA256(payload))`
 *
 * DUAS DECISÕES QUE VALEM A EXPLICAÇÃO:
 *
 * 1. **Web Crypto, não `node:crypto`.** O middleware do Next roda no runtime
 *    Edge, onde `node:crypto` não existe. Usando `crypto.subtle`, o MESMO código
 *    valida o cookie no middleware e no servidor — o que dispensa a configuração
 *    dividida em dois arquivos que o Auth.js exigia.
 *
 * 2. **Sessão sem tabela.** O cookie carrega o e-mail e a expiração, assinados.
 *    Não há nada para guardar nem para limpar. Isso não enfraquece a revogação
 *    porque quem decide o acesso é `sessaoAtual()`, que a cada requisição
 *    confere se o e-mail ainda pertence a um sócio ativo. Desativar alguém corta
 *    o acesso na hora, mesmo com o cookie válido na mão.
 */

export const NOME_COOKIE = "financeops_sessao";

/** 7 dias. Curto porque o custo de reentrar é um clique num e-mail. */
export const DURACAO_SESSAO_SEG = 7 * 24 * 60 * 60;

export type Sessao = {
  /** E-mail em minúsculas. É a identidade. */
  email: string;
  /** Expiração em segundos desde a época. */
  exp: number;
};

// --- base64url sem depender de Buffer (que não existe no Edge) -------------

function paraBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * O tipo de retorno é explícito porque `crypto.subtle` exige um `BufferSource`
 * respaldado por `ArrayBuffer`. `Uint8Array.from(...)` devolve
 * `Uint8Array<ArrayBufferLike>`, que inclui `SharedArrayBuffer` e por isso o TS
 * recusa — daí o `new Uint8Array(tamanho)`, que fixa o buffer certo.
 */
function deBase64Url(texto: string): Uint8Array<ArrayBuffer> {
  const b64 = texto.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// ---------------------------------------------------------------------------

function segredo(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      "AUTH_SECRET ausente ou curto demais. Gere com: openssl rand -base64 32"
    );
  }
  return s;
}

async function chave(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(segredo()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function assinarSessao(email: string): Promise<string> {
  const payload: Sessao = {
    email: email.toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + DURACAO_SESSAO_SEG,
  };
  const corpo = new TextEncoder().encode(JSON.stringify(payload));
  const assinatura = await crypto.subtle.sign("HMAC", await chave(), corpo);
  return `${paraBase64Url(corpo)}.${paraBase64Url(new Uint8Array(assinatura))}`;
}

/**
 * Devolve a sessão ou null. Nunca lança: cookie corrompido é apenas "sem
 * sessão", não erro 500 na cara do usuário.
 *
 * `crypto.subtle.verify` compara em tempo constante — é o que impede descobrir
 * a assinatura byte a byte medindo o tempo de resposta.
 */
export async function lerSessao(valor: string | undefined): Promise<Sessao | null> {
  if (!valor) return null;

  const [corpoB64, assinaturaB64] = valor.split(".");
  if (!corpoB64 || !assinaturaB64) return null;

  try {
    const corpo = deBase64Url(corpoB64);
    const assinatura = deBase64Url(assinaturaB64);

    const valida = await crypto.subtle.verify("HMAC", await chave(), assinatura, corpo);
    if (!valida) return null;

    const sessao = JSON.parse(new TextDecoder().decode(corpo)) as Sessao;
    if (!sessao?.email || typeof sessao.exp !== "number") return null;
    if (sessao.exp <= Math.floor(Date.now() / 1000)) return null;

    return sessao;
  } catch {
    return null;
  }
}

/** Opções do cookie. `secure` só fora de dev, senão o localhost em HTTP quebra. */
export function opcoesCookie() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACAO_SESSAO_SEG,
  };
}
