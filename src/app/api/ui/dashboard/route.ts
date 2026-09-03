import { NextRequest } from "next/server";
import {
  posicaoCaixa,
  resumoMensal,
  serieMensal,
  despesaPorCategoria,
  receitaPorCliente,
  distribuicaoPorSocio,
  impostosEmAberto,
  caixinhasComSaldo,
  ultimosNMeses,
  Regime,
} from "@/lib/queries";
import { calcularFatorR } from "@/lib/simples";
import { gerarLancamentosRecorrentes, projetarCaixa } from "@/lib/recorrentes";
import { competenciaDe } from "@/lib/datas";
import { exigirSocio } from "@/lib/sessao";

export const dynamic = "force-dynamic";

/**
 * Endpoints sob /api/ui servem A TELA e podem mudar de forma a qualquer momento.
 * A API de integração vive em /api/v1 e tem contrato estável.
 *
 * Manter os dois separados é o que evita que um ajuste de layout vire uma quebra
 * silenciosa no sistema interno que consome os dados.
 */
export async function GET(req: NextRequest) {
  const sessao = await exigirSocio();
  if (sessao instanceof Response) return sessao;

  try {
    // Materializa recorrentes vencidos ao abrir o painel. Idempotente.
    await gerarLancamentosRecorrentes();

    const { searchParams } = new URL(req.url);
    const regime: Regime =
      searchParams.get("regime") === "CAIXA" ? "CAIXA" : "COMPETENCIA";
    const meses = Math.min(Math.max(Number(searchParams.get("meses") ?? 12), 1), 48);

    const janela = ultimosNMeses(meses);
    const mesAtual = competenciaDe(new Date());

    const [caixa, mes, serie, categorias, clientes, socios, guias, fatorR, caixinhas] =
      await Promise.all([
        posicaoCaixa(),
        resumoMensal(mesAtual, regime),
        serieMensal(janela.de, janela.ate, regime),
        despesaPorCategoria(janela.de, janela.ate, regime),
        receitaPorCliente(janela.de, janela.ate, regime),
        distribuicaoPorSocio(),
        impostosEmAberto(),
        calcularFatorR(new Date()),
        caixinhasComSaldo(),
      ]);

    const projecao = await projetarCaixa(6, caixa.saldoContaCentavos);

    const em15Dias = new Date(Date.now() + 15 * 864e5);
    const vencendo = guias.filter((g) => g.vencimento && g.vencimento <= em15Dias);

    return Response.json({
      regime,
      meses,
      mesAtual,
      caixa,
      mes,
      serie,
      categorias,
      clientes,
      socios,
      fatorR,
      projecao,
      caixinhas: caixinhas
        .filter((c) => c.ativa)
        .map((c) => ({
          id: c.id,
          nome: c.nome,
          cor: c.cor,
          icone: c.icone,
          saldoCentavos: c.saldoCentavos,
          metaCentavos: c.metaCentavos,
          progresso: c.progresso,
        })),
      alertaGuias: {
        quantidade: vencendo.length,
        totalCentavos: vencendo.reduce((s, g) => s + g.valorCentavos, 0),
      },
    });
  } catch (e) {
    return Response.json({ erro: (e as Error).message }, { status: 500 });
  }
}
