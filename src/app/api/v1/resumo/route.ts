import { NextRequest } from "next/server";
import { verificarToken } from "@/lib/api-auth";
import { posicaoCaixa, serieMensal, distribuicaoPorSocio, margemPorCliente, Regime } from "@/lib/queries";
import { calcularFatorR, calcularAliquota } from "@/lib/simples";
import { competenciaDe, competenciaSomar } from "@/lib/datas";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/resumo?regime=COMPETENCIA&meses=12
 *
 * Endpoint pensado para o cliente interno montar um painel sem replicar
 * nenhuma regra de negócio. Toda a lógica de "o imposto conta na competência ou
 * no caixa" já vem resolvida aqui — é o motivo de existir esta rota em vez de
 * mandar o outro sistema consultar as tabelas direto.
 */
export async function GET(req: NextRequest) {
  const negado = verificarToken(req);
  if (negado) return negado;

  const { searchParams } = new URL(req.url);
  const regime: Regime = searchParams.get("regime") === "CAIXA" ? "CAIXA" : "COMPETENCIA";
  const meses = Math.min(Number(searchParams.get("meses") ?? 12), 48);

  const ate = competenciaDe(new Date());
  const de = competenciaSomar(ate, -(meses - 1));

  const [caixa, serie, socios, clientes, fatorR, aliquota] = await Promise.all([
    posicaoCaixa(),
    serieMensal(de, ate, regime),
    distribuicaoPorSocio(),
    margemPorCliente(),
    calcularFatorR(new Date()),
    calcularAliquota(new Date()),
  ]);

  return Response.json({
    geradoEm: new Date().toISOString(),
    regime,
    periodo: { de, ate },
    caixa,
    fiscal: {
      aliquotaEfetivaBps: aliquota.aliquotaBps,
      anexo: aliquota.anexo,
      faixa: aliquota.faixa,
      rbt12Centavos: aliquota.rbt12Centavos,
      fatorRBps: fatorR.fatorBps,
      folha12Centavos: fatorR.folha12Centavos,
    },
    mensal: serie,
    socios,
    clientes,
  });
}
