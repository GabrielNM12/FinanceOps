import { prisma } from "@/lib/db";
import { gerarCSV, centavosParaCSV } from "@/lib/csv";
import { paraInputDate, competenciaDe } from "@/lib/datas";
import { exigirSocio } from "@/lib/sessao";

export const dynamic = "force-dynamic";

/** Relação de provisões e guias — é o arquivo que vai para o contador. */
export async function GET() {
  const sessao = await exigirSocio();
  if (sessao instanceof Response) return sessao;

  const impostos = await prisma.imposto.findMany({
    include: { receita: { include: { cliente: true } }, pagamento: true },
    orderBy: [{ vencimento: "asc" }],
  });

  const linhas = impostos.map((i) => ({
    competencia: competenciaDe(i.receita.dataCompetencia),
    receita: i.receita.descricao,
    cliente: i.receita.cliente?.nome ?? "",
    base_calculo: centavosParaCSV(i.receita.valorCentavos),
    aliquota_pct: i.aliquotaBps !== null ? (i.aliquotaBps / 100).toFixed(2).replace(".", ",") : "",
    anexo: i.anexo ?? "",
    rbt12: i.rbt12Centavos !== null ? centavosParaCSV(i.rbt12Centavos) : "",
    valor: centavosParaCSV(i.valorCentavos),
    status: i.status,
    vencimento: i.vencimento ? paraInputDate(i.vencimento) : "",
    data_pagamento: i.pagamento?.dataCaixa ? paraInputDate(i.pagamento.dataCaixa) : "",
  }));

  const csv = gerarCSV(linhas);
  const nome = `korvantis-impostos-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nome}"`,
    },
  });
}
