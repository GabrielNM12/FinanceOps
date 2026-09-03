import { prisma } from "./db";
import { janelaRBT12, competenciaDe, dataUTC } from "./datas";
import {
  Anexo,
  LIMITE_FATOR_R_BPS,
  aliquotaEfetivaPura,
  fatorRBps,
  anexoPorFatorR,
  faltaParaAnexoIII,
  rbt12Proporcional,
} from "./simples-calc";

/**
 * Camada de dados do Simples Nacional: busca no banco e delega a aritmética
 * para simples-calc.ts (que é puro e testável sem banco).
 *
 * ATENÇÃO: isto é aritmética sobre os números que você alimentar. Não substitui
 * seu contador.
 */

export type { Anexo };
export { LIMITE_FATOR_R_BPS, aliquotaEfetivaPura };

// ---------------------------------------------------------------------------

/**
 * RBT12 em centavos. Usa dataCompetencia (faturamento), não dataCaixa — é o
 * faturamento que define a faixa, independente de o cliente ter pago.
 */
export async function receitaBrutaUltimos12Meses(referencia: Date): Promise<number> {
  const { de, ate } = janelaRBT12(referencia);

  const [agg, linhas] = await Promise.all([
    prisma.transacao.aggregate({
      _sum: { valorCentavos: true },
      where: { tipo: "ENTRADA", dataCompetencia: { gte: de, lte: ate } },
    }),
    prisma.transacao.findMany({
      where: { tipo: "ENTRADA", dataCompetencia: { gte: de, lte: ate } },
      select: { dataCompetencia: true },
    }),
  ]);

  const mesesAtivos = new Set(linhas.map((l) => competenciaDe(l.dataCompetencia))).size;
  return rbt12Proporcional(agg._sum.valorCentavos ?? 0, mesesAtivos);
}

/**
 * Folha dos últimos 12 meses, em centavos.
 *
 * Conta apenas PRO_LABORE. Distribuição de LUCRO não entra na folha — e é
 * exatamente por isso que a escolha entre pró-labore e distribuição muda o
 * Anexo aplicável. Se vocês tiverem CLT, some os salários aqui também.
 */
export async function folhaUltimos12Meses(referencia: Date): Promise<number> {
  const { de, ate } = janelaRBT12(referencia);

  const agg = await prisma.distribuicao.aggregate({
    _sum: { valorCentavos: true },
    where: {
      natureza: "PRO_LABORE",
      transacao: { is: { dataCompetencia: { gte: de, lte: ate } } },
    },
  });
  return agg._sum.valorCentavos ?? 0;
}

export type FatorR = {
  rbt12Centavos: number;
  folha12Centavos: number;
  fatorBps: number | null;
  anexo: Anexo;
  faltaParaAnexoIIICentavos: number;
  /** true entre 26% e 30% — uma variação pequena muda o anexo. */
  zonaDeAtencao: boolean;
};

export async function calcularFatorR(referencia: Date): Promise<FatorR> {
  const [rbt12, folha12] = await Promise.all([
    receitaBrutaUltimos12Meses(referencia),
    folhaUltimos12Meses(referencia),
  ]);

  const fator = fatorRBps(folha12, rbt12);

  return {
    rbt12Centavos: rbt12,
    folha12Centavos: folha12,
    fatorBps: fator,
    anexo: anexoPorFatorR(fator),
    faltaParaAnexoIIICentavos: rbt12 > 0 ? faltaParaAnexoIII(folha12, rbt12) : 0,
    zonaDeAtencao: fator !== null && fator >= 2600 && fator <= 3000,
  };
}

/** Respeita a config `anexo_simples` ("AUTO" | "III" | "V"). */
export async function definirAnexo(referencia: Date): Promise<Anexo> {
  const cfg = await prisma.config.findUnique({ where: { chave: "anexo_simples" } });
  if (cfg?.valor === "III" || cfg?.valor === "V") return cfg.valor;
  return (await calcularFatorR(referencia)).anexo;
}

// ---------------------------------------------------------------------------

export type CalculoSimples = {
  aliquotaBps: number;
  anexo: Anexo;
  rbt12Centavos: number;
  faixa: number;
  aliquotaNominalBps: number;
  deducaoCentavos: number;
  aviso?: string;
};

/**
 * Alíquota efetiva para uma competência.
 * `anexoForcado` existe para a tela de simulação comparar III vs V.
 */
export async function calcularAliquota(
  referencia: Date,
  anexoForcado?: Anexo
): Promise<CalculoSimples> {
  const anexo = anexoForcado ?? (await definirAnexo(referencia));
  const rbt12 = await receitaBrutaUltimos12Meses(referencia);

  const faixas = await prisma.faixaSimples.findMany({
    where: { anexo },
    orderBy: { faixa: "asc" },
  });
  if (faixas.length === 0) {
    throw new Error(`Faixas do Anexo ${anexo} não cadastradas. Rode "npm run db:seed".`);
  }

  if (rbt12 <= 0) {
    const f = faixas[0];
    return {
      aliquotaBps: f.aliquotaNominalBps,
      anexo,
      rbt12Centavos: 0,
      faixa: f.faixa,
      aliquotaNominalBps: f.aliquotaNominalBps,
      deducaoCentavos: f.deducaoCentavos,
    };
  }

  const ultima = faixas[faixas.length - 1];
  const faixa =
    faixas.find(
      (f) => rbt12 >= f.limiteInferiorCentavos && rbt12 <= f.limiteSuperiorCentavos
    ) ?? ultima;

  const aviso =
    rbt12 > ultima.limiteSuperiorCentavos
      ? "RBT12 acima do teto do Simples. A empresa provavelmente foi desenquadrada — " +
        "a alíquota abaixo é só uma extrapolação da última faixa. Fale com o contador."
      : undefined;

  return {
    aliquotaBps: aliquotaEfetivaPura(rbt12, faixa.aliquotaNominalBps, faixa.deducaoCentavos),
    anexo,
    rbt12Centavos: rbt12,
    faixa: faixa.faixa,
    aliquotaNominalBps: faixa.aliquotaNominalBps,
    deducaoCentavos: faixa.deducaoCentavos,
    aviso,
  };
}

/** Dia de vencimento do DAS configurado (default 20). */
export async function diaVencimentoDAS(): Promise<number> {
  const cfg = await prisma.config.findUnique({ where: { chave: "dia_vencimento_das" } });
  const n = Number(cfg?.valor ?? 20);
  return Number.isInteger(n) && n >= 1 && n <= 28 ? n : 20;
}

/** Projeção do DAS de uma competência a partir das receitas já lançadas nela. */
export async function projetarDASdaCompetencia(competencia: string) {
  const [a, m] = competencia.split("-").map(Number);
  const de = dataUTC(a, m, 1);
  const ate = new Date(Date.UTC(a, m, 0, 23, 59, 59, 999));

  const [agg, calc] = await Promise.all([
    prisma.transacao.aggregate({
      _sum: { valorCentavos: true },
      where: { tipo: "ENTRADA", dataCompetencia: { gte: de, lte: ate } },
    }),
    calcularAliquota(de),
  ]);

  const receita = agg._sum.valorCentavos ?? 0;
  return {
    competencia,
    receitaCentavos: receita,
    ...calc,
    dasCentavos: Math.round((receita * calc.aliquotaBps) / 10_000),
  };
}
