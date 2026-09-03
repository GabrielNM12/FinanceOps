import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { podeEntrar } from "@/lib/acesso";
import { assinarSessao, NOME_COOKIE, opcoesCookie } from "@/lib/sessao-cookie";
import { hashToken, estadoDoToken } from "@/lib/token-acesso";
import { urlPublica } from "@/lib/url-publica";

/** Roda em Node: usa `node:crypto` para o hash e o Prisma para o banco. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Consome o link do e-mail e abre a sessão.
 *
 * A ordem das checagens importa:
 *
 * 1. Token existe, não expirou e não foi usado.
 * 2. Marca como usado ANTES de emitir a sessão — se algo falhar depois, o link
 *    já queimou. Um link que sobrevive a erro é um link reutilizável.
 * 3. Só então confere se o e-mail ainda é de sócio ativo. É o que impede um link
 *    pedido antes de a pessoa ser desativada de ainda funcionar.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("t");
  const destino = req.nextUrl.searchParams.get("destino");

  // NÃO use `req.url` para montar redirecionamentos: atrás do proxy ele é o
  // socket interno (`http://0.0.0.0:3000`), não o endereço que o usuário abriu.
  const base = urlPublica(req.headers);

  const recusar = (motivo: string) => {
    const url = new URL("/login", base);
    url.searchParams.set("erro", motivo);
    return NextResponse.redirect(url);
  };

  if (!token) return recusar("link_invalido");

  const registro = await prisma.tokenAcesso.findUnique({
    where: { tokenHash: hashToken(token) },
  });

  const estado = estadoDoToken(registro);
  if (estado !== "VALIDO") {
    // Expirado, já usado e inexistente viram a mesma mensagem: para quem está na
    // tela, a ação é a mesma — pedir um link novo.
    return recusar("link_expirado");
  }

  await prisma.tokenAcesso.update({
    where: { id: registro!.id },
    data: { usadoEm: new Date() },
  });

  const socios = await prisma.socio.findMany({
    select: { id: true, nome: true, email: true, ativo: true },
  });
  const decisao = podeEntrar(
    registro!.email,
    socios,
    process.env.AUTH_BOOTSTRAP_EMAIL
  );
  if (!decisao.permitido) return recusar("sem_acesso");

  // `destino` vem da própria aplicação, mas chega pela URL — tratar como
  // entrada externa. Só caminho relativo: sem isso o link viraria um redirecionador
  // aberto para qualquer site.
  const seguro = destino && /^\/(?!\/)/.test(destino) ? destino : "/";

  const resposta = NextResponse.redirect(new URL(seguro, base));
  resposta.cookies.set(NOME_COOKIE, await assinarSessao(registro!.email), opcoesCookie());
  return resposta;
}
