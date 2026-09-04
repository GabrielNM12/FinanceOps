import { prisma } from "./db";
import {
  competenciaDe,
  competenciaSomar,
  rangeCompetencias,
  diaDoMesSeguro,
  Competencia,
} from "./datas";
import { t } from "@/lib/i18n";

/**
 * Materialização de gastos recorrentes.
 *
 * Por que materializar em vez de calcular na hora:
 *  - a conta de luz nunca vem igual — você precisa editar o valor daquele mês;
 *  - o histórico tem que bater com o extrato bancário, e o extrato tem a linha;
 *  - anexar comprovante exige um registro real para pendurar.
 *
 * O preço é ter que rodar isto. A idempotência vem da unique
 * (recorrenteId, competenciaRef) no schema: rodar 50 vezes gera os mesmos
 * lançamentos. Chamamos no carregamento do dashboard e num botão manual.
 *
 * Lançamentos gerados nascem com dataCaixa = null (previsto, não pago).
 * Você confirma o pagamento na tela de transações.
 */

export type ResultadoGeracao = {
  criados: number;
  detalhes: { recorrente: string; competencia: Competencia; valorCentavos: number }[];
};

export async function gerarLancamentosRecorrentes(
  ateCompetencia: Competencia = competenciaDe(new Date())
): Promise<ResultadoGeracao> {
  const recorrentes = await prisma.recorrente.findMany({ where: { ativo: true } });
  const detalhes: ResultadoGeracao["detalhes"] = [];

  for (const r of recorrentes) {
    const primeira = competenciaDe(r.inicio);
    // Não gera além do fim, se houver.
    const limite = r.fim
      ? [competenciaDe(r.fim), ateCompetencia].sort()[0]
      : ateCompetencia;
    if (primeira > limite) continue;

    const competencias = rangeCompetencias(primeira, limite);

    const existentes = await prisma.transacao.findMany({
      where: { recorrenteId: r.id, competenciaRef: { in: competencias } },
      select: { competenciaRef: true },
    });
    const jaTem = new Set(existentes.map((e) => e.competenciaRef));

    for (const c of competencias) {
      if (jaTem.has(c)) continue;

      const [ano, mes] = c.split("-").map(Number);
      const vencimento = diaDoMesSeguro(ano, mes, r.diaVencimento);

      await prisma.transacao.create({
        data: {
          tipo: r.tipo,
          descricao: r.descricao,
          valorCentavos: r.valorCentavos,
          categoriaId: r.categoriaId,
          dataCompetencia: vencimento,
          dataCaixa: null, // previsto — confirme o pagamento na tela
          recorrenteId: r.id,
          competenciaRef: c,
          observacoes: t.generated.recorrenteAuto,
        },
      });

      detalhes.push({ recorrente: r.descricao, competencia: c, valorCentavos: r.valorCentavos });
    }
  }

  return { criados: detalhes.length, detalhes };
}

/**
 * Projeção de caixa futuro. NÃO grava nada — recorrentes futuros são cálculo
 * puro. Materializar o futuro criaria despesa que ainda não existe e sujaria
 * todo relatório de competência.
 */
export async function projetarCaixa(meses = 6, saldoInicialCentavos = 0) {
  const hoje = competenciaDe(new Date());
  const recorrentes = await prisma.recorrente.findMany({ where: { ativo: true } });

  const saida: {
    competencia: Competencia;
    entradasCentavos: number;
    saidasCentavos: number;
    saldoProjetadoCentavos: number;
  }[] = [];

  let saldo = saldoInicialCentavos;

  for (let i = 1; i <= meses; i++) {
    const c = competenciaSomar(hoje, i);
    const [ano, mes] = c.split("-").map(Number);
    const refMes = new Date(Date.UTC(ano, mes - 1, 15));

    let entradas = 0;
    let saidas = 0;

    for (const r of recorrentes) {
      if (r.inicio > refMes) continue;
      if (r.fim && r.fim < refMes) continue;
      if (r.tipo === "ENTRADA") entradas += r.valorCentavos;
      else saidas += r.valorCentavos;
    }

    // Compromissos já lançados e ainda não pagos que caem nesse mês.
    const pendentes = await prisma.transacao.aggregate({
      _sum: { valorCentavos: true },
      where: {
        tipo: { in: ["SAIDA", "DISTRIBUICAO"] },
        dataCaixa: null,
        recorrenteId: null,
        dataCompetencia: {
          gte: new Date(Date.UTC(ano, mes - 1, 1)),
          lte: new Date(Date.UTC(ano, mes, 0, 23, 59, 59, 999)),
        },
      },
    });
    saidas += pendentes._sum.valorCentavos ?? 0;

    // Guias de imposto com vencimento no mês.
    const guias = await prisma.imposto.aggregate({
      _sum: { valorCentavos: true },
      where: {
        status: "PROVISIONADO",
        vencimento: {
          gte: new Date(Date.UTC(ano, mes - 1, 1)),
          lte: new Date(Date.UTC(ano, mes, 0, 23, 59, 59, 999)),
        },
      },
    });
    saidas += guias._sum.valorCentavos ?? 0;

    saldo += entradas - saidas;
    saida.push({
      competencia: c,
      entradasCentavos: entradas,
      saidasCentavos: saidas,
      saldoProjetadoCentavos: saldo,
    });
  }

  return saida;
}
