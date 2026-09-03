import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { gerarCSV, centavosParaCSV } from "@/lib/csv";
import { paraInputDate } from "@/lib/datas";
import { exigirSocio } from "@/lib/sessao";

export const dynamic = "force-dynamic";

/**
 * Exporta lançamentos em CSV.
 *
 * O formato de saída é o MESMO que o importador aceita — dá para exportar,
 * corrigir na planilha e reimportar sem duplicar (o hash cuida disso).
 *
 * Filtros: ?de=2026-01&ate=2026-12&tipo=ENTRADA
 */
export async function GET(req: NextRequest) {
  const sessao = await exigirSocio();
  if (sessao instanceof Response) return sessao;

  const { searchParams } = new URL(req.url);
  const de = searchParams.get("de");
  const ate = searchParams.get("ate");
  const tipo = searchParams.get("tipo");

  const where: Record<string, unknown> = {};
  if (tipo) where.tipo = tipo;
  if (de || ate) {
    where.dataCompetencia = {
      ...(de ? { gte: new Date(`${de}-01T00:00:00Z`) } : {}),
      ...(ate ? { lte: new Date(`${ate}-31T23:59:59Z`) } : {}),
    };
  }

  const transacoes = await prisma.transacao.findMany({
    where,
    include: { cliente: true, categoria: true, socio: true, impostos: true },
    orderBy: { dataCompetencia: "asc" },
  });

  const linhas = transacoes.map((t) => ({
    data: paraInputDate(t.dataCompetencia),
    descricao: t.descricao,
    valor: centavosParaCSV(t.valorCentavos),
    tipo: t.tipo,
    categoria: t.categoria?.nome ?? "",
    cliente: t.cliente?.nome ?? "",
    data_caixa: t.dataCaixa ? paraInputDate(t.dataCaixa) : "",
    socio: t.socio?.nome ?? "",
    imposto: centavosParaCSV(
      t.impostos.filter((i) => i.status !== "CANCELADO").reduce((s, i) => s + i.valorCentavos, 0)
    ),
    observacoes: t.observacoes ?? "",
  }));

  const csv = gerarCSV(linhas);
  const nome = `korvantis-lancamentos-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nome}"`,
    },
  });
}
