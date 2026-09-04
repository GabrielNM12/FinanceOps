import { NextRequest } from "next/server";
import { t } from "@/lib/i18n";

/**
 * Autenticação da API de integração.
 *
 * Enquanto o app roda só na sua máquina, não há token e tudo é liberado — pedir
 * senha para você mesmo em localhost só atrapalha. No momento em que o projeto
 * interno passar a consumir esta API pela rede, defina API_TOKEN no .env e o
 * bloqueio passa a valer automaticamente.
 *
 * Isso é intencionalmente simples: um token compartilhado. Se a integração
 * crescer, troque por JWT ou pelo mesmo mecanismo de auth do projeto interno.
 */
export function verificarToken(req: NextRequest): Response | null {
  const esperado = process.env.API_TOKEN;
  if (!esperado) return null; // sem token configurado = modo local aberto

  const header = req.headers.get("authorization") ?? "";
  const enviado = header.replace(/^Bearer\s+/i, "");

  if (enviado !== esperado) {
    return Response.json({ erro: t.errors.naoAutorizadoBearer }, { status: 401 });
  }
  return null;
}

export function erro(mensagem: string, status = 400) {
  return Response.json({ erro: mensagem }, { status });
}
