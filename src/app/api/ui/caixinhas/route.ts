import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { caixinhasComSaldo, posicaoCaixa } from "@/lib/queries";
import { exigirSocio } from "@/lib/sessao";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sessao = await exigirSocio();
  if (sessao instanceof Response) return sessao;

  try {
    const { searchParams } = new URL(req.url);
    const detalhe = searchParams.get("detalhe"); // id da caixinha aberta

    const [caixinhas, posicao] = await Promise.all([
      caixinhasComSaldo(),
      posicaoCaixa(),
    ]);

    // O histórico só vem da caixinha que está aberta na tela. Trazer o de todas
    // faria o payload crescer sem ninguém olhar.
    const movimentos = detalhe
      ? await prisma.movimentoCaixinha.findMany({
          where: { caixinhaId: detalhe },
          orderBy: [{ data: "desc" }, { criadoEm: "desc" }],
          take: 100,
        })
      : [];

    return Response.json({
      caixinhas,
      totais: {
        guardadoCentavos: posicao.guardadoCentavos,
        saldoContaCentavos: posicao.saldoContaCentavos,
        patrimonioCentavos: posicao.patrimonioCentavos,
        caixaLivreCentavos: posicao.caixaLivreCentavos,
      },
      detalhe: detalhe
        ? {
            caixinhaId: detalhe,
            movimentos: movimentos.map((m) => ({
              id: m.id,
              tipo: m.tipo,
              valorCentavos: m.valorCentavos,
              data: m.data.toISOString(),
              descricao: m.descricao,
            })),
          }
        : null,
    });
  } catch (e) {
    return Response.json({ erro: (e as Error).message }, { status: 500 });
  }
}
