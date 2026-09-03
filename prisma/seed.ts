import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const R$ = (reais: number) => Math.round(reais * 100);

/**
 * Faixas do Simples Nacional — Anexos III e V (LC 123/2006, tabelas vigentes
 * desde 2018).
 *
 * >>> CONFIRME COM SEU CONTADOR ANTES DE CONFIAR NOS NÚMEROS. <<<
 * Elas vivem no banco justamente para você corrigir sem tocar em código:
 * Configurações -> Faixas do Simples.
 */
const FAIXAS = [
  // anexo, faixa, limiteInferior, limiteSuperior, aliquotaNominal %, dedução R$
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
] as const;

const CATEGORIAS = [
  // "Projetos" é ENTRADA: é por onde entra o faturamento dos projetos. Se você
  // quiser usá-la como despesa, troque a natureza em Configurações.
  { nome: "Projetos", natureza: "ENTRADA", cor: "#22c55e" },
  { nome: "Impostos", natureza: "SAIDA", ehImposto: true, cor: "#ef4444" },
  { nome: "Ferramentas", natureza: "SAIDA", cor: "#2eb3c7" },
  { nome: "Contabilidade", natureza: "SAIDA", cor: "#64748b" },
  { nome: "Escritório", natureza: "SAIDA", cor: "#0ea5e9" },
];

/**
 * Sociedade igualitária entre 6 sócios.
 *
 * 100% ÷ 6 = 16,666...%, que não fecha em inteiro. Usamos o mesmo rateio de
 * maiores restos do resto do sistema: quatro sócios com 16,67% e dois com
 * 16,66%, somando exatamente 10000 bps. Deixar 16,67% para todos daria 100,02%
 * e o app acusaria inconsistência todo mês.
 */
/**
 * O e-mail é a identidade de login. Quem estiver sem e-mail aqui não consegue
 * entrar até alguém cadastrar o endereço em Configurações → Sócios.
 */
const SOCIOS: { nome: string; email?: string }[] = [
  { nome: "Gabriel Hilamatu" },
  { nome: "Gabriel Muller", email: "gabrielnmuller12@gmail.com" },
  { nome: "Uelinton Paula" },
  { nome: "Morôni Lima" },
  { nome: "Guilherme Dalmolin" },
  { nome: "Bruno Bettiol" },
];

function participacoesIguais(qtd: number): number[] {
  const base = Math.trunc(10_000 / qtd);
  const resto = 10_000 - base * qtd;
  return Array.from({ length: qtd }, (_, i) => base + (i < resto ? 1 : 0));
}

async function main() {
  console.log("Populando faixas do Simples Nacional...");
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

  console.log("Populando categorias padrão...");
  for (const c of CATEGORIAS) {
    await prisma.categoria.upsert({
      where: { nome: c.nome },
      update: {},
      create: c,
    });
  }

  console.log("Gravando configuração inicial...");
  const configs = [
    // "AUTO" = decide pelo Fator R. Force "III" ou "V" se seu contador mandar.
    { chave: "anexo_simples", valor: "AUTO" },
    { chave: "dia_vencimento_das", valor: "20" },
    { chave: "regime_padrao_dashboard", valor: "COMPETENCIA" },
  ];
  for (const c of configs) {
    await prisma.config.upsert({ where: { chave: c.chave }, update: {}, create: c });
  }

  console.log("Populando sócios...");
  const partes = participacoesIguais(SOCIOS.length);
  for (let i = 0; i < SOCIOS.length; i++) {
    const { nome, email } = SOCIOS[i];
    const existente = await prisma.socio.findFirst({ where: { nome } });
    if (existente) {
      // Sócio já criado: completa o e-mail se ele ainda estiver vazio, sem
      // sobrescrever um endereço que alguém tenha ajustado na tela.
      if (email && !existente.email) {
        await prisma.socio.update({ where: { id: existente.id }, data: { email } });
      }
      continue;
    }
    await prisma.socio.create({
      data: { nome, email: email ?? null, participacaoBps: partes[i] },
    });
  }
  console.log(
    `  ${SOCIOS.length} sócios, participações somando ${
      partes.reduce((s, p) => s + p, 0) / 100
    }%`
  );

  console.log("\nSeed concluído.");
  console.log("Cadastre seus clientes em Configurações → Clientes.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
