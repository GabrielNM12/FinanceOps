import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Token do link de acesso — a parte que roda só no servidor.
 *
 * Diferente do cookie (Web Crypto, porque precisa do Edge), aqui `node:crypto`
 * serve: geração e consumo do token acontecem em server action e route handler,
 * nunca no middleware.
 */

/** 15 minutos. É um segredo que trafega por e-mail; quanto menos tempo, melhor. */
export const MINUTOS_VALIDADE = 15;

/**
 * 32 bytes = 256 bits de entropia, em base64url.
 *
 * Não use `Math.random()` para isto em hipótese alguma: ele é previsível, e
 * quem previr o token entra na conta de outra pessoa sem tocar no e-mail dela.
 */
export function gerarToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * O banco guarda só o hash. Um vazamento do arquivo do banco não permite montar
 * um link válido — mesma lógica de não guardar senha em claro.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Comparação em tempo constante, para o tempo de resposta não vazar o token. */
export function hashesIguais(a: string, b: string): boolean {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function expiraEm(agora = new Date()): Date {
  return new Date(agora.getTime() + MINUTOS_VALIDADE * 60_000);
}

export type EstadoToken = "VALIDO" | "INEXISTENTE" | "EXPIRADO" | "JA_USADO";

/**
 * Estado de um token, sem tocar no banco — para poder ser testado.
 *
 * Expirado e já usado devolvem estados distintos aqui porque a diferença ajuda
 * no log e na mensagem. Para o usuário, a tela mostra o mesmo texto: "peça um
 * novo link".
 */
export function estadoDoToken(
  registro: { expiraEm: Date; usadoEm: Date | null } | null,
  agora = new Date()
): EstadoToken {
  if (!registro) return "INEXISTENTE";
  if (registro.usadoEm) return "JA_USADO";
  if (registro.expiraEm.getTime() <= agora.getTime()) return "EXPIRADO";
  return "VALIDO";
}
