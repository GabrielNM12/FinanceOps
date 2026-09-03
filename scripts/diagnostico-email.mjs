/**
 * Diagnóstico do envio de e-mail.
 *
 *     npm run auth:diagnostico
 *     npm run auth:diagnostico -- destino@exemplo.com    (envia um teste real)
 *
 * POR QUE ISTO EXISTE:
 * a tela de login responde a mesma coisa para e-mail autorizado e desconhecido —
 * de propósito, para não virar um verificador de quem tem acesso. O efeito
 * colateral é que "não recebi o e-mail" tem quatro causas indistinguíveis pela
 * interface:
 *
 *   1. o endereço não está cadastrado em nenhum sócio;
 *   2. o sócio está inativo;
 *   3. o SMTP não está configurado (ou o servidor subiu antes do .env);
 *   4. o SMTP recusou a mensagem.
 *
 * Este script separa as quatro em dez segundos.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

/**
 * O nodemailer é carregado sob demanda, e a falha não derruba o script.
 *
 * Dentro do container o Next empacota o nodemailer dentro do bundle do servidor
 * (`output: standalone`), então ele não existe como pacote em `node_modules` —
 * um `import` no topo mata o diagnóstico inteiro com ERR_MODULE_NOT_FOUND. Só
 * que as quatro causas que este script separa, três não dependem dele: as
 * variáveis, o cadastro do sócio e o estado do e-mail. Perder o teste de
 * conexão é aceitável; perder o diagnóstico justo quando o login não funciona,
 * não.
 */
async function carregarNodemailer() {
  try {
    return (await import("nodemailer")).createTransport;
  } catch {
    return null;
  }
}

// --- .env ------------------------------------------------------------------
// Carregado à mão: `tsx`/`node` não leem .env sozinhos, só o Next lê.
function carregarEnv() {
  const caminho = join(process.cwd(), ".env");
  if (!existsSync(caminho)) return false;

  for (const linha of readFileSync(caminho, "utf8").split("\n")) {
    const m = linha.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/i);
    if (!m) continue;
    const valor = m[2].trim().replace(/^["'](.*)["']$/, "$1");
    if (!(m[1] in process.env)) process.env[m[1]] = valor;
  }
  return true;
}

const ok = (t) => `  \x1b[32m✓\x1b[0m ${t}`;
const nok = (t) => `  \x1b[31m✗\x1b[0m ${t}`;
const aviso = (t) => `  \x1b[33m!\x1b[0m ${t}`;

const prisma = new PrismaClient();

async function main() {
  const destino = process.argv[2];

  console.log("\nFinanceOps — diagnóstico de acesso por e-mail\n");

  // --- 1. .env -------------------------------------------------------------
  console.log("1. Arquivo .env");
  // Em Docker não existe .env: as variáveis vêm do compose. Marcar isso como
  // erro mandaria você caçar um arquivo que não deveria existir mesmo.
  if (carregarEnv()) console.log(ok(".env encontrado"));
  else if (process.env.AUTH_SECRET)
    console.log(aviso("sem .env — variáveis vindo do ambiente (normal em Docker)"));
  else console.log(nok(".env NÃO existe — rode `npm run setup`"));

  // --- 2. Variáveis --------------------------------------------------------
  console.log("\n2. Variáveis de ambiente");
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM, AUTH_SECRET, APP_URL } =
    process.env;

  console.log(AUTH_SECRET?.length >= 16
    ? ok("AUTH_SECRET definido")
    : nok("AUTH_SECRET ausente ou curto — gere com: openssl rand -base64 32"));
  console.log(SMTP_HOST ? ok(`SMTP_HOST = ${SMTP_HOST}`) : nok("SMTP_HOST vazio"));
  console.log(ok(`SMTP_PORT = ${SMTP_PORT ?? "587 (padrão)"}`));
  console.log(SMTP_USER ? ok(`SMTP_USER = ${SMTP_USER}`) : aviso("SMTP_USER vazio (servidor sem autenticação?)"));
  console.log(SMTP_PASS
    ? ok(`SMTP_PASS = ${"•".repeat(Math.min(SMTP_PASS.length, 16))} (${SMTP_PASS.length} caracteres)`)
    : nok("SMTP_PASS vazio"));
  console.log(EMAIL_FROM ? ok(`EMAIL_FROM = ${EMAIL_FROM}`) : nok("EMAIL_FROM vazio"));
  console.log(APP_URL ? ok(`APP_URL = ${APP_URL}`) : aviso("APP_URL vazio — a URL será deduzida da requisição"));

  // Senha de app do Google vem com espaços na tela ("abcd efgh ijkl mnop") e
  // muita gente cola assim. O Gmail recusa; o erro que volta fala de credencial,
  // não de espaço.
  if (SMTP_PASS?.includes(" ")) {
    console.log(nok("SMTP_PASS contém ESPAÇO — remova; senha de app do Google vai sem espaços"));
  }
  if (SMTP_HOST?.includes("gmail") && SMTP_PASS && SMTP_PASS.replace(/\s/g, "").length !== 16) {
    console.log(aviso("Gmail espera senha de APP com 16 caracteres, não a senha da conta"));
  }

  const temSMTP = Boolean(SMTP_HOST && EMAIL_FROM);
  if (!temSMTP) {
    console.log(aviso("Sem SMTP completo: em desenvolvimento o link vai para o CONSOLE do servidor"));
  }

  // --- 3. Quem pode entrar -------------------------------------------------
  console.log("\n3. Sócios e e-mails cadastrados");
  const socios = await prisma.socio.findMany({ orderBy: { nome: "asc" } });
  for (const s of socios) {
    const rotulo = `${s.nome.padEnd(22)} ${s.email ?? "(sem e-mail)"}`;
    console.log(s.email && s.ativo ? ok(rotulo) : aviso(`${rotulo}${s.ativo ? "" : "  [INATIVO]"}`));
  }
  const comAcesso = socios.filter((s) => s.email && s.ativo).length;
  if (comAcesso === 0) {
    console.log(nok("NINGUÉM consegue entrar. Use AUTH_BOOTSTRAP_EMAIL ou cadastre um e-mail."));
  }
  if (process.env.AUTH_BOOTSTRAP_EMAIL) {
    console.log(aviso(`AUTH_BOOTSTRAP_EMAIL ativo: ${process.env.AUTH_BOOTSTRAP_EMAIL} — remova em produção`));
  }

  // --- 4. Se um destino foi informado, confere se ele entraria -------------
  if (destino) {
    console.log(`\n4. O endereço "${destino}" tem acesso?`);
    const alvo = destino.trim().toLowerCase();
    const socio = socios.find((s) => (s.email ?? "").toLowerCase() === alvo);
    const boot = (process.env.AUTH_BOOTSTRAP_EMAIL ?? "").toLowerCase() === alvo;

    if (socio?.ativo) console.log(ok(`sim — sócio ${socio.nome}`));
    else if (socio) console.log(nok(`não — ${socio.nome} está INATIVO`));
    else if (boot) console.log(ok("sim — via AUTH_BOOTSTRAP_EMAIL"));
    else {
      console.log(nok("NÃO ESTÁ CADASTRADO — o sistema não envia e-mail e a tela não avisa"));
      console.log("     Cadastre em Configurações -> Sócios, ou use AUTH_BOOTSTRAP_EMAIL.");
    }
  }

  // --- 5. Conexão e envio de teste ----------------------------------------
  const createTransport = await carregarNodemailer();

  if (temSMTP && !createTransport) {
    console.log("\n5. Conexão SMTP");
    console.log(aviso("nodemailer não é importável aqui — teste de conexão pulado"));
    console.log("     Normal dentro do container: o Next empacota o nodemailer no");
    console.log("     bundle do servidor. As checagens acima continuam valendo.");
    console.log("     Para testar a conexão de verdade, rode na sua máquina:");
    console.log("     npm run auth:diagnostico -- seu@email.com");
  } else if (temSMTP) {
    console.log("\n5. Conexão SMTP");
    const porta = Number(SMTP_PORT ?? 587);
    const transporte = createTransport({
      host: SMTP_HOST,
      port: porta,
      secure: porta === 465,
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    });

    try {
      await transporte.verify();
      console.log(ok("servidor aceitou a conexão e as credenciais"));
    } catch (e) {
      console.log(nok(`falhou: ${e.message}`));
      console.log("     Causas comuns: senha de app errada, 2FA não ativado na conta,");
      console.log("     porta bloqueada pela VPS, ou 'app menos seguro' desativado.");
      return;
    }

    if (destino) {
      console.log(`\n6. Enviando e-mail de teste para ${destino}`);
      try {
        const r = await transporte.sendMail({
          to: destino,
          from: EMAIL_FROM,
          subject: "FinanceOps — teste de envio",
          text: "Se você recebeu esta mensagem, o SMTP do FinanceOps está funcionando.",
        });
        console.log(ok(`aceito pelo servidor (messageId ${r.messageId})`));
        if (r.rejected.length) console.log(nok(`recusados: ${r.rejected.join(", ")}`));
        console.log("     Não chegou? Confira spam e o log do provedor — o problema");
        console.log("     passa a ser de entrega, não do FinanceOps.");
      } catch (e) {
        console.log(nok(`falhou no envio: ${e.message}`));
      }
    } else {
      console.log("\n   Para enviar um teste real:");
      console.log("   npm run auth:diagnostico -- seu@email.com");
    }
  }

  console.log("");
}

main()
  .catch((e) => {
    console.error("\nDiagnóstico falhou:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
