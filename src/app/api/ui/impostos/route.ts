import { prisma } from "@/lib/db";
import { impostosEmAberto } from "@/lib/queries";
import { calcularAliquota, calcularFatorR, projetarDASdaCompetencia } from "@/lib/simples";
import { competenciaDe, formatarData, formatarCompetencia } from "@/lib/datas";
import { exigirSocio } from "@/lib/sessao";

export const dynamic = "force-dynamic";

export async function GET() {
  const sessao = await exigirSocio();
  if (sessao instanceof Response) return sessao;

  try {
    const mesAtual = competenciaDe(new Date());

    const [abertas, pagamentos, calc, fatorR, projecao] = await Promise.all([
      impostosEmAberto(),
      prisma.transacao.findMany({
        where: { categoria: { is: { ehImposto: true } }, tipo: "SAIDA" },
        include: { impostosQuitados: { select: { id: true } } },
        orderBy: { dataCaixa: "desc" },
        take: 50,
      }),
      calcularAliquota(new Date()),
      calcularFatorR(new Date()),
      projetarDASdaCompetencia(mesAtual),
    ]);

    const hoje = new Date();
    const vencidas = abertas.filter((g) => g.vencimento && g.vencimento < hoje);
    const soma = (l: typeof abertas) => l.reduce((s, g) => s + g.valorCentavos, 0);

    // A separação que o caixa livre usa: provisão lastreada em dinheiro que já
    // está na conta vs. provisão que depende do cliente pagar.
    const sobreRecebido = abertas.filter((g) => g.receita.dataCaixa !== null);
    const sobreAReceber = abertas.filter((g) => g.receita.dataCaixa === null);

    // O caso perigoso: a guia vence pelo faturamento, mas o dinheiro não entrou.
    const em15Dias = new Date(hoje.getTime() + 15 * 864e5);
    const risco = sobreAReceber.filter((g) => g.vencimento && g.vencimento <= em15Dias);

    return Response.json({
      mesAtual,
      calc,
      fatorRBps: fatorR.fatorBps,
      projecao,
      totais: {
        abertoCentavos: soma(abertas),
        vencidoCentavos: soma(vencidas),
        sobreRecebidoCentavos: soma(sobreRecebido),
        sobreAReceberCentavos: soma(sobreAReceber),
        qtdAberto: abertas.length,
        qtdVencido: vencidas.length,
        qtdSobreAReceber: sobreAReceber.length,
      },
      risco: {
        quantidade: risco.length,
        totalCentavos: soma(risco),
      },
      // Datas já formatadas: a tela de impostos só exibe, não faz conta com elas.
      abertas: abertas.map((g) => ({
        id: g.id,
        descricaoReceita: g.receita.descricao,
        cliente: g.receita.cliente?.nome ?? null,
        competencia: formatarCompetencia(competenciaDe(g.receita.dataCompetencia)),
        vencimento: g.vencimento ? formatarData(g.vencimento) : null,
        valorCentavos: g.valorCentavos,
        aliquotaBps: g.aliquotaBps,
        anexo: g.anexo,
        vencida: !!g.vencimento && g.vencimento < hoje,
        receitaRecebida: g.receita.dataCaixa !== null,
      })),
      pagamentos: pagamentos.map((p) => ({
        id: p.id,
        descricao: p.descricao,
        data: formatarData(p.dataCaixa),
        valorCentavos: p.valorCentavos,
        quantidade: p.impostosQuitados.length,
      })),
    });
  } catch (e) {
    return Response.json({ erro: (e as Error).message }, { status: 500 });
  }
}
