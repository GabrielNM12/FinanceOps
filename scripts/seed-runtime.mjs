/**
 * Seed executável dentro do container.
 *
 * O `prisma/seed.ts` é TypeScript e depende do `tsx`, que é devDependency e não
 * existe na imagem de produção. Este arquivo faz o mesmo em JavaScript puro,
 * usando só o client do Prisma que já está na imagem.
 *
 * Idempotente: tudo é upsert ou create condicional. Rodar em todo boot do
 * container não duplica nem sobrescreve nada.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const R$ = (reais) => Math.round(reais * 100);

const FAIXAS = [
  ["III", 1, 0, 180_000, 6.0, 0],
  ["III", 2, 180_000.01, 360_000, 11.2, 9_360],
  ["III", 3, 360_000.01, 720_000, 13.5, 17_640],
  ["III", 4, 720_000.01, 1_800_000, 16.0, 35_640],
  ["III", 5, 1_800_000.01, 3_600_000, 21.0, 125_640],
  ["III", 6, 3_600_000.01, 4_800_000, 33.0, 648_000],
  ["V", 1, 0, 180_000, 15.5, 0],
  ["V", 2, 180_000.01, 360_000, 18.0, 4_500],
  ["V", 3, 360_000.01, 720_000, 19.5, 9_900],
  ["V", 4, 720_000.01, 1_800_000, 20.5, 17_100],
  ["V", 5, 1_800_000.01, 3_600_000, 23.0, 62_100],
  ["V", 6, 3_600_000.01, 4_800_000, 30.5, 540_000],
];

const CATEGORIAS = [
  { nome: "Projetos", natureza: "ENTRADA", cor: "#22c55e" },
  { nome: "Impostos", natureza: "SAIDA", ehImposto: true, cor: "#ef4444" },
  { nome: "Ferramentas", natureza: "SAIDA", cor: "#2eb3c7" },
  { nome: "Contabilidade", natureza: "SAIDA", cor: "#64748b" },
  { nome: "Escritório", natureza: "SAIDA", cor: "#0ea5e9" },
];

const SOCIOS = [
  { nome: "Gabriel Hilamatu" },
  { nome: "Gabriel Muller", email: "gabrielnmuller12@gmail.com" },
  { nome: "Uelinton Paula" },
  { nome: "Morôni Lima" },
  { nome: "Guilherme Dalmolin" },
  { nome: "Bruno Bettiol" },
];

function participacoesIguais(qtd) {
  const base = Math.trunc(10_000 / qtd);
  const resto = 10_000 - base * qtd;
  return Array.from({ length: qtd }, (_, i) => base + (i < resto ? 1 : 0));
}

async function main() {
  for (const [anexo, faixa, inf, sup, aliq, ded] of FAIXAS) {
    const existente = await prisma.faixaSimples.findFirst({ where: { anexo, faixa } });
    const dados = {
      anexo,
      faixa,
      limiteInferiorCentavos: R$(inf),
      limiteSuperiorCentavos: R$(sup),
      aliquotaNominalBps: Math.round(aliq * 100),
      deducaoCentavos: R$(ded),
    };
    if (existente) {
      await prisma.faixaSimples.update({ where: { id: existente.id }, data: dados });
    } else {
      await prisma.faixaSimples.create({ data: dados });
    }
  }

  for (const c of CATEGORIAS) {
    await prisma.categoria.upsert({ where: { nome: c.nome }, update: {}, create: c });
  }

  for (const c of [
    { chave: "anexo_simples", valor: "AUTO" },
    { chave: "dia_vencimento_das", valor: "20" },
    { chave: "regime_padrao_dashboard", valor: "COMPETENCIA" },
  ]) {
    await prisma.config.upsert({ where: { chave: c.chave }, update: {}, create: c });
  }

  const partes = participacoesIguais(SOCIOS.length);
  for (let i = 0; i < SOCIOS.length; i++) {
    const { nome, email } = SOCIOS[i];
    const existente = await prisma.socio.findFirst({ where: { nome } });
    if (!existente) {
      await prisma.socio.create({
        data: { nome, email: email ?? null, participacaoBps: partes[i] },
      });
    } else if (email && !existente.email) {
      await prisma.socio.update({ where: { id: existente.id }, data: { email } });
    }
  }

  const comEmail = await prisma.socio.count({ where: { email: { not: null } } });
  if (comEmail === 0) {
    console.log(
      "[FinanceOps] Nenhum sócio tem e-mail — ninguém consegue entrar ainda.\n" +
        "             Defina AUTH_BOOTSTRAP_EMAIL no .env, entre com ele e\n" +
        "             cadastre os e-mails em Configurações → Sócios."
    );
  }
}

main()
  .catch((e) => {
    console.error("[FinanceOps] seed falhou:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
