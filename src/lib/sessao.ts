import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { podeEntrar, normalizarEmail, type SocioAutorizado } from "@/lib/acesso";
import { NOME_COOKIE, lerSessao } from "@/lib/sessao-cookie";
import { MSG_SESSAO_EXPIRADA } from "@/lib/rotas";
import { demoLigado, EMAIL_DEMO } from "@/lib/modo-demo";

/**
 * A fronteira de segurança de verdade.
 *
 * O middleware só confere a assinatura do cookie — ele roda no Edge e não
 * consulta o banco. Aqui, no servidor, a pergunta é a que importa: **este e-mail
 * ainda pertence a um sócio ativo?**
 *
 * Refazer essa checagem a cada requisição é o que permite desativar alguém, ou
 * trocar o e-mail dele, e o acesso morrer na hora — mesmo com o cookie ainda
 * dentro da validade. É também o motivo de a sessão não precisar de tabela.
 */
export type Autenticado = {
  email: string;
  socio: SocioAutorizado | null;
  /** true quando entrou pelo AUTH_BOOTSTRAP_EMAIL, sem sócio correspondente. */
  bootstrap: boolean;
  /** true quando não houve autenticação nenhuma: MODO_DEMO ligado. */
  demo?: boolean;
};

export async function sessaoAtual(): Promise<Autenticado | null> {
  // Modo demo: não há login, e portanto não há nada para verificar. A sessão
  // assume o primeiro sócio ativo para que autoria e auditoria continuem
  // preenchidas — as telas ficam realistas e a trilha não fica com buracos.
  // Ver src/lib/modo-demo.ts para o porquê de isto ser perigoso.
  if (demoLigado(process.env.MODO_DEMO)) {
    const socio = await prisma.socio.findFirst({
      where: { ativo: true },
      orderBy: { criadoEm: "asc" },
      select: { id: true, nome: true, email: true, ativo: true },
    });
    return { email: EMAIL_DEMO, socio, bootstrap: false, demo: true };
  }

  const cookie = cookies().get(NOME_COOKIE)?.value;
  const sessao = await lerSessao(cookie);
  if (!sessao) return null;

  const email = normalizarEmail(sessao.email);
  const socios = await prisma.socio.findMany({
    select: { id: true, nome: true, email: true, ativo: true },
  });

  const decisao = podeEntrar(email, socios, process.env.AUTH_BOOTSTRAP_EMAIL);
  if (!decisao.permitido) return null;

  return {
    email,
    socio: decisao.socio,
    bootstrap: decisao.motivo === "BOOTSTRAP",
    demo: false,
  };
}

/** Resposta 401 padrão para os endpoints de UI. */
export function naoAutorizado() {
  return Response.json({ erro: MSG_SESSAO_EXPIRADA }, { status: 401 });
}

/**
 * Açúcar para o começo de todo handler de /api/ui:
 *
 *     const sessao = await exigirSocio();
 *     if (sessao instanceof Response) return sessao;
 */
export async function exigirSocio(): Promise<Autenticado | Response> {
  const sessao = await sessaoAtual();
  return sessao ?? naoAutorizado();
}

/**
 * Mesma checagem, para server actions — que escrevem no banco.
 *
 * Não dá para confiar só no middleware aqui. Server action é um endpoint POST
 * como outro qualquer: quem souber o ID da action consegue chamá-la direto, sem
 * passar por tela nenhuma. Toda função que grava começa por esta linha.
 */
export async function exigirAcesso(): Promise<Autenticado> {
  const sessao = await sessaoAtual();
  if (!sessao) {
    throw new Error(MSG_SESSAO_EXPIRADA);
  }
  return sessao;
}
