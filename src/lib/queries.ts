import type { Categoria, Cliente } from "@prisma/client";
import { prisma } from "./db";
import {
  caixaLivre,
  caixaLivreProjetado,
  impostoEmAberto,
  patrimonio,
  saldoCaixinha,
  progressoMeta,
} from "./caixa";
import {
  Competencia,
  inicioDaCompetencia,
  fimDaCompetencia,
  competenciaSomar,
  rangeCompetencias,
  competenciaDe,
} from "./datas";
import { t } from "@/lib/i18n";

/**
 * Camada de leitura do dashboard.
 *
 * REGRA CENTRAL — o imposto mora em dois lugares e NUNCA pode ser somado nos dois:
 *
 *   COMPETENCIA -> imposto vem de fin_imposto (provisionado, no mês da receita).
 *                  As SAIDAs com categoria.ehImposto são EXCLUÍDAS.
 *   CAIXA       -> imposto vem das SAIDAs com categoria.ehImposto (guia paga).
 *                  fin_imposto é ignorada.
 *
 * Por isso todo acesso a esses números passa por aqui, e nenhuma tela monta
 * agregação própria.
 *
 * Segunda regra: distribuição de LUCRO não é despesa (é destinação do lucro).
 * PRO_LABORE é despesa. REEMBOLSO não é despesa — a despesa original já foi
 * lançada quando o sócio pagou; o reembolso só move caixa.
 */

export type Regime = "CAIXA" | "COMPETENCIA";

const campoData = (regime: Regime) =>
  regime === "CAIXA" ? "dataCaixa" : "dataCompetencia";

function filtroPeriodo(regime: Regime, de: Date, ate: Date) {
  return regime === "CAIXA"
    ? { dataCaixa: { gte: de, lte: ate } }
    : { dataCompetencia: { gte: de, lte: ate } };
}

// ---------------------------------------------------------------------------
// Fechamento mensal
// ---------------------------------------------------------------------------

export type ResumoMensal = {
  competencia: Competencia;
  regime: Regime;
  faturadoCentavos: number;
  impostoCentavos: number;
  despesaCentavos: number;
  lucroCentavos: number;
  distribuidoCentavos: number;
  /** Lucro que sobrou sem distribuir no mês. */
  retidoCentavos: number;
};

export async function resumoMensal(
  competencia: Competencia,
  regime: Regime = "COMPETENCIA"
): Promise<ResumoMensal> {
  const de = inicioDaCompetencia(competencia);
  const ate = fimDaCompetencia(competencia);
  const periodo = filtroPeriodo(regime, de, ate);

  const [entradas, saidas, proLabore, lucros, impostosProvisionados] =
    await Promise.all([
      prisma.transacao.aggregate({
        _sum: { valorCentavos: true },
        where: { tipo: "ENTRADA", ...periodo },
      }),
      // No regime de competência, tira a guia de imposto para não dobrar.
      prisma.transacao.aggregate({
        _sum: { valorCentavos: true },
        where: {
          tipo: "SAIDA",
          ...periodo,
          ...(regime === "COMPETENCIA"
            ? { categoria: { is: { ehImposto: false } } }
            : {}),
        },
      }),
      prisma.distribuicao.aggregate({
        _sum: { valorCentavos: true },
        where: { natureza: "PRO_LABORE", transacao: { is: periodo } },
      }),
      prisma.distribuicao.aggregate({
        _sum: { valorCentavos: true },
        where: { natureza: "LUCRO", transacao: { is: periodo } },
      }),
      prisma.imposto.aggregate({
        _sum: { valorCentavos: true },
        where: { status: { not: "CANCELADO" }, receita: { is: periodo } },
      }),
    ]);

  // No caixa, o imposto é a guia efetivamente paga naquele mês.
  const impostoCaixa =
    regime === "CAIXA"
      ? (
          await prisma.transacao.aggregate({
            _sum: { valorCentavos: true },
            where: {
              tipo: "SAIDA",
              ...periodo,
              categoria: { is: { ehImposto: true } },
            },
          })
        )._sum.valorCentavos ?? 0
      : 0;

  const faturado = entradas._sum.valorCentavos ?? 0;
  const imposto =
    regime === "CAIXA" ? impostoCaixa : impostosProvisionados._sum.valorCentavos ?? 0;

  // saidas já exclui a guia no regime de competência; no caixa ela está dentro,
  // então subtraímos para não contar duas vezes na linha de despesa.
  const saidasTotal = saidas._sum.valorCentavos ?? 0;
  const despesaOperacional =
    (regime === "CAIXA" ? saidasTotal - impostoCaixa : saidasTotal) +
    (proLabore._sum.valorCentavos ?? 0);

  const lucro = faturado - imposto - despesaOperacional;
  const distribuido = lucros._sum.valorCentavos ?? 0;

  return {
    competencia,
    regime,
    faturadoCentavos: faturado,
    impostoCentavos: imposto,
    despesaCentavos: despesaOperacional,
    lucroCentavos: lucro,
    distribuidoCentavos: distribuido,
    retidoCentavos: lucro - distribuido,
  };
}

/** Série para o gráfico de fluxo mensal. */
export async function serieMensal(
  de: Competencia,
  ate: Competencia,
  regime: Regime = "COMPETENCIA"
): Promise<ResumoMensal[]> {
  const meses = rangeCompetencias(de, ate);
  return Promise.all(meses.map((m) => resumoMensal(m, regime)));
}

export function ultimosNMeses(n: number, fim: Competencia = competenciaDe(new Date())) {
  return { de: competenciaSomar(fim, -(n - 1)), ate: fim };
}

// ---------------------------------------------------------------------------
// Caixa
// ---------------------------------------------------------------------------

export type PosicaoCaixa = {
  /** Dinheiro na conta corrente, JÁ líquido do que está nas caixinhas. */
  saldoContaCentavos: number;
  /** Provisão em aberto sobre receita JÁ recebida — é o que reduz o caixa livre. */
  impostoSobreRecebidoCentavos: number;
  /** Provisão em aberto sobre receita a receber — obrigação futura, não reduz. */
  impostoSobreAReceberCentavos: number;
  /** Soma dos dois. Só para exibição; nunca use no caixa livre. */
  impostoProvisionadoCentavos: number;
  /** Total nas caixinhas. Já foi descontado de saldoContaCentavos. */
  guardadoCentavos: number;
  /** Conta + caixinhas. O dinheiro total da empresa. */
  patrimonioCentavos: number;
  /** Ver a regra e o trade-off em src/lib/caixa.ts. */
  caixaLivreCentavos: number;
  /** Caixa livre se tudo que está a receber entrasse (já líquido do imposto). */
  caixaLivreProjetadoCentavos: number;
  aReceberCentavos: number;
  aPagarCentavos: number;
};

export async function posicaoCaixa(): Promise<PosicaoCaixa> {
  const [
    entradas,
    saidas,
    provisaoSobreRecebido,
    provisaoSobreAReceber,
    aReceber,
    aPagar,
    movimentos,
  ] = await Promise.all([
    prisma.transacao.aggregate({
      _sum: { valorCentavos: true },
      where: { tipo: { in: ["ENTRADA", "APORTE"] }, dataCaixa: { not: null } },
    }),
    prisma.transacao.aggregate({
      _sum: { valorCentavos: true },
      where: { tipo: { in: ["SAIDA", "DISTRIBUICAO"] }, dataCaixa: { not: null } },
    }),
    // A receita que originou a provisão já entrou na conta?
    prisma.imposto.aggregate({
      _sum: { valorCentavos: true },
      where: { status: "PROVISIONADO", receita: { is: { dataCaixa: { not: null } } } },
    }),
    prisma.imposto.aggregate({
      _sum: { valorCentavos: true },
      where: { status: "PROVISIONADO", receita: { is: { dataCaixa: null } } },
    }),
    prisma.transacao.aggregate({
      _sum: { valorCentavos: true },
      where: { tipo: "ENTRADA", dataCaixa: null },
    }),
    prisma.transacao.aggregate({
      _sum: { valorCentavos: true },
      where: { tipo: { in: ["SAIDA", "DISTRIBUICAO"] }, dataCaixa: null },
    }),
    // As TRANSFERENCIAS do ledger são ignoradas em todas as agregações; o que
    // define quanto saiu da conta para as caixinhas são os movimentos.
    prisma.movimentoCaixinha.groupBy({
      by: ["tipo"],
      _sum: { valorCentavos: true },
    }),
  ]);

  const porTipo = (t: string) =>
    movimentos.find((m) => m.tipo === t)?._sum.valorCentavos ?? 0;
  const guardado = porTipo("DEPOSITO") - porTipo("RESGATE");

  const caixaBruto =
    (entradas._sum.valorCentavos ?? 0) - (saidas._sum.valorCentavos ?? 0);

  const composicao = {
    // O que está na conta é o caixa do ledger menos o que foi para as caixinhas.
    saldoContaCentavos: caixaBruto - guardado,
    impostoSobreRecebidoCentavos: provisaoSobreRecebido._sum.valorCentavos ?? 0,
    impostoSobreAReceberCentavos: provisaoSobreAReceber._sum.valorCentavos ?? 0,
    guardadoCentavos: guardado,
  };

  const receber = aReceber._sum.valorCentavos ?? 0;

  return {
    ...composicao,
    impostoProvisionadoCentavos: impostoEmAberto(composicao),
    patrimonioCentavos: patrimonio(composicao),
    caixaLivreCentavos: caixaLivre(composicao),
    caixaLivreProjetadoCentavos: caixaLivreProjetado(composicao, receber),
    aReceberCentavos: receber,
    aPagarCentavos: aPagar._sum.valorCentavos ?? 0,
  };
}

/** Caixinhas com saldo e progresso da meta, prontas para a tela. */
export async function caixinhasComSaldo() {
  const caixinhas = await prisma.caixinha.findMany({
    include: { movimentos: { select: { tipo: true, valorCentavos: true } } },
    orderBy: [{ ativa: "desc" }, { nome: "asc" }],
  });

  return caixinhas.map((c) => {
    const saldo = saldoCaixinha(c.movimentos);
    return {
      id: c.id,
      nome: c.nome,
      cor: c.cor,
      icone: c.icone,
      ativa: c.ativa,
      observacoes: c.observacoes,
      metaCentavos: c.metaCentavos,
      metaData: c.metaData ? c.metaData.toISOString() : null,
      saldoCentavos: saldo,
      qtdMovimentos: c.movimentos.length,
      progresso: progressoMeta(saldo, c.metaCentavos),
    };
  });
}

// ---------------------------------------------------------------------------
// Recortes
// ---------------------------------------------------------------------------

export async function despesaPorCategoria(
  de: Competencia,
  ate: Competencia,
  regime: Regime = "COMPETENCIA"
) {
  const inicio = inicioDaCompetencia(de);
  const fim = fimDaCompetencia(ate);

  const linhas = await prisma.transacao.groupBy({
    by: ["categoriaId"],
    _sum: { valorCentavos: true },
    where: { tipo: "SAIDA", ...filtroPeriodo(regime, inicio, fim) },
  });

  const categorias = await prisma.categoria.findMany();
  const mapa = new Map<string, Categoria>(categorias.map((c) => [c.id, c]));

  return linhas
    .map((l) => ({
      id: l.categoriaId ?? "sem-categoria",
      nome: l.categoriaId ? mapa.get(l.categoriaId)?.nome ?? "—" : t.queries.semCategoria,
      cor: l.categoriaId ? mapa.get(l.categoriaId)?.cor ?? "#94a3b8" : "#94a3b8",
      valorCentavos: l._sum.valorCentavos ?? 0,
    }))
    .filter((l) => l.valorCentavos > 0)
    .sort((a, b) => b.valorCentavos - a.valorCentavos);
}

export async function receitaPorCliente(
  de: Competencia,
  ate: Competencia,
  regime: Regime = "COMPETENCIA"
) {
  const inicio = inicioDaCompetencia(de);
  const fim = fimDaCompetencia(ate);

  const linhas = await prisma.transacao.groupBy({
    by: ["clienteId"],
    _sum: { valorCentavos: true },
    where: { tipo: "ENTRADA", ...filtroPeriodo(regime, inicio, fim) },
  });

  const clientes = await prisma.cliente.findMany();
  const mapa = new Map<string, Cliente>(clientes.map((c) => [c.id, c]));

  return linhas
    .map((l) => ({
      id: l.clienteId ?? "sem-cliente",
      nome: l.clienteId ? mapa.get(l.clienteId)?.nome ?? "—" : t.queries.semCliente,
      valorCentavos: l._sum.valorCentavos ?? 0,
    }))
    .filter((l) => l.valorCentavos > 0)
    .sort((a, b) => b.valorCentavos - a.valorCentavos);
}

/** Total distribuído por sócio, desde sempre, quebrado por natureza. */
export async function distribuicaoPorSocio() {
  const [socios, linhas] = await Promise.all([
    prisma.socio.findMany({ orderBy: { nome: "asc" } }),
    prisma.distribuicao.groupBy({
      by: ["socioId", "natureza"],
      _sum: { valorCentavos: true },
    }),
  ]);

  return socios.map((s) => {
    const doSocio = linhas.filter((l) => l.socioId === s.id);
    const por = (n: string) =>
      doSocio.find((l) => l.natureza === n)?._sum.valorCentavos ?? 0;

    const lucro = por("LUCRO");
    const proLabore = por("PRO_LABORE");
    const reembolso = por("REEMBOLSO");

    return {
      id: s.id,
      nome: s.nome,
      participacaoBps: s.participacaoBps,
      lucroCentavos: lucro,
      proLaboreCentavos: proLabore,
      reembolsoCentavos: reembolso,
      // Reembolso não é remuneração — é devolução de dinheiro do sócio.
      totalRemuneracaoCentavos: lucro + proLabore,
    };
  });
}

/**
 * Margem por cliente: receita − impostos daquela receita − despesas vinculadas.
 * É o número que responde "esse cliente valeu a pena?".
 *
 * Despesas gerais (contabilidade, escritório) não entram: elas não pertencem a
 * um cliente específico e ratear arbitrariamente distorceria a comparação.
 */
export async function margemPorCliente() {
  const clientes = await prisma.cliente.findMany({ orderBy: { nome: "asc" } });

  return Promise.all(
    clientes.map(async (c) => {
      const [receita, despesa, imposto] = await Promise.all([
        prisma.transacao.aggregate({
          _sum: { valorCentavos: true },
          where: { clienteId: c.id, tipo: "ENTRADA" },
        }),
        prisma.transacao.aggregate({
          _sum: { valorCentavos: true },
          where: { clienteId: c.id, tipo: "SAIDA" },
        }),
        prisma.imposto.aggregate({
          _sum: { valorCentavos: true },
          where: { status: { not: "CANCELADO" }, receita: { is: { clienteId: c.id } } },
        }),
      ]);

      const r = receita._sum.valorCentavos ?? 0;
      const d = despesa._sum.valorCentavos ?? 0;
      const i = imposto._sum.valorCentavos ?? 0;
      const margem = r - d - i;

      return {
        id: c.id,
        nome: c.nome,
        ativo: c.ativo,
        receitaCentavos: r,
        despesaCentavos: d,
        impostoCentavos: i,
        margemCentavos: margem,
        margemBps: r > 0 ? Math.round((margem / r) * 10_000) : 0,
      };
    })
  );
}

/** Guias em aberto, para a tela de impostos e para o alerta do dashboard. */
/**
 * Guias em aberto. O `dataCaixa` da receita vem junto porque a tela precisa
 * separar o que já está lastreado em dinheiro na conta do que ainda depende do
 * cliente pagar.
 */
export async function impostosEmAberto() {
  return prisma.imposto.findMany({
    where: { status: "PROVISIONADO" },
    include: { receita: { include: { cliente: true } } },
    orderBy: { vencimento: "asc" },
  });
}

export { campoData };
