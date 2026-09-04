"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createTransport } from "nodemailer";

import { prisma } from "@/lib/db";
import { podeEntrar, normalizarEmail, mensagemDeRecusa } from "@/lib/acesso";
import { NOME_COOKIE, opcoesCookie } from "@/lib/sessao-cookie";
import {
  gerarToken,
  hashToken,
  expiraEm,
  MINUTOS_VALIDADE,
} from "@/lib/token-acesso";
import { assuntoAcesso, htmlAcesso, textoAcesso } from "@/lib/email-acesso";
import { urlPublica } from "@/lib/url-publica";
import { rota } from "@/lib/rotas";
import { t } from "@/lib/i18n";

/**
 * URL pública do app. A regra mora em `@/lib/url-publica` porque o link do
 * e-mail e o redirecionamento de `/entrar` precisam concordar — se divergirem,
 * a pessoa recebe um link certo que termina numa página errada.
 */
function urlBase(): string {
  return urlPublica(headers());
}

async function enviarLink(email: string, url: string) {
  const temSMTP = Boolean(process.env.SMTP_HOST && process.env.EMAIL_FROM);

  if (!temSMTP) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(t.errors.smtpNaoConfigurado);
    }
    // Em desenvolvimento o link vai para o console — dá para trabalhar numa
    // máquina nova sem credencial de e-mail nenhuma.
    //
    // O aviso é escandaloso de propósito. Este é o caminho que mais confunde:
    // a tela diz "confira seu e-mail", nada chega, e não há erro em lugar
    // nenhum. Acontece principalmente quando o SMTP é adicionado ao .env com o
    // servidor JÁ rodando — as variáveis são lidas na inicialização do processo.
    console.warn(
      [
        "",
        "=".repeat(72),
        "[FinanceOps] NENHUM E-MAIL FOI ENVIADO — SMTP não está configurado",
        "",
        `  destinatário: ${email}`,
        `  SMTP_HOST:    ${process.env.SMTP_HOST ?? "(vazio)"}`,
        `  EMAIL_FROM:   ${process.env.EMAIL_FROM ?? "(vazio)"}`,
        "",
        "  Se você acabou de preencher o .env, REINICIE o servidor:",
        "  as variáveis de ambiente são lidas quando o processo sobe.",
        "",
        "  Link de acesso (use este para entrar agora):",
        `  ${url}`,
        "=".repeat(72),
        "",
      ].join("\n")
    );
    return;
  }

  const porta = Number(process.env.SMTP_PORT ?? 587);
  const transporte = createTransport({
    host: process.env.SMTP_HOST,
    port: porta,
    // 465 é TLS implícito; 587 negocia STARTTLS.
    secure: porta === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });

  const r = await transporte.sendMail({
    to: email,
    from: process.env.EMAIL_FROM,
    subject: assuntoAcesso(),
    text: textoAcesso({ url, minutos: MINUTOS_VALIDADE }),
    html: htmlAcesso({ url, host: new URL(url).host, minutos: MINUTOS_VALIDADE }),
  });

  const recusados = r.rejected.filter(Boolean);
  if (recusados.length > 0) {
    throw new Error(t.errors.servidorEmailRecusou(recusados.join(", ")));
  }

  // Confirmação no log do servidor. Sem isto, "não chegou" é indistinguível de
  // "não foi enviado", e são problemas completamente diferentes: um é do
  // provedor de e-mail, o outro é daqui.
  console.info(
    `[FinanceOps] link enviado para ${email} via ${process.env.SMTP_HOST} ` +
      `(messageId ${r.messageId})`
  );
}

/**
 * Pede o link de acesso.
 *
 * IMPORTANTE: o retorno é o mesmo para e-mail autorizado e desconhecido. A
 * diferença é só que num caso o e-mail sai e no outro não. Isso evita que a tela
 * de login vire uma forma de descobrir quem tem acesso — e, por tabela, quem
 * trabalha na empresa.
 */
export async function pedirAcesso(
  emailInformado: string,
  destino?: string
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const email = normalizarEmail(emailInformado);

  const socios = await prisma.socio.findMany({
    select: { id: true, nome: true, email: true, ativo: true },
  });

  const decisao = podeEntrar(email, socios, process.env.AUTH_BOOTSTRAP_EMAIL);

  if (!decisao.permitido) {
    // A tela não conta o motivo — mas o LOG DO SERVIDOR conta.
    //
    // Sem esta linha, pedir acesso para um endereço não cadastrado produz
    // exatamente a mesma tela de sucesso e nenhum vestígio: quem administra fica
    // procurando problema no SMTP quando o e-mail simplesmente não está na lista.
    console.warn(
      `[FinanceOps] acesso NEGADO para "${email}" (${decisao.motivo}) — ` +
        `nenhum e-mail foi enviado. ` +
        `Cadastrados: ${socios
          .filter((s) => s.email)
          .map((s) => s.email)
          .join(", ") || "(nenhum sócio tem e-mail)"}`
    );

    // Só o e-mail malformado devolve erro de verdade; é problema de digitação,
    // não vazamento de informação.
    if (decisao.motivo === "SEM_EMAIL") {
      return { ok: false, erro: mensagemDeRecusa(decisao.motivo) };
    }
    return { ok: true };
  }

  const token = gerarToken();

  await prisma.$transaction(async (tx) => {
    // Um pedido novo invalida os anteriores: dois links válidos ao mesmo tempo
    // dobram a janela de exposição sem trazer benefício nenhum.
    await tx.tokenAcesso.deleteMany({ where: { email } });
    await tx.tokenAcesso.create({
      data: { email, tokenHash: hashToken(token), expiraEm: expiraEm() },
    });
    // Faxina oportunista: sem isto a tabela cresce para sempre.
    await tx.tokenAcesso.deleteMany({ where: { expiraEm: { lt: new Date() } } });
  });

  const url = new URL(rota("entrar"), urlBase());
  url.searchParams.set("t", token);
  if (destino) url.searchParams.set("destino", destino);

  try {
    await enviarLink(email, url.toString());
    return { ok: true };
  } catch (e) {
    // Falha de SMTP precisa aparecer: sem isso a pessoa fica esperando um e-mail
    // que nunca vai chegar.
    console.error("[FinanceOps] falha ao enviar link de acesso:", e);
    await prisma.tokenAcesso.deleteMany({ where: { email } });
    return {
      ok: false,
      erro: t.errors.naoConsegueEnviarEmail,
    };
  }
}

export async function sair() {
  cookies().delete(NOME_COOKIE);
  redirect(rota("login"));
}
