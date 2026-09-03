import { gerarCSV } from "@/lib/csv";
import { exigirSocio } from "@/lib/sessao";

/** Modelo em branco para quem vai montar o CSV na mão. */
export async function GET() {
  const sessao = await exigirSocio();
  if (sessao instanceof Response) return sessao;

  const exemplo = [
    {
      data: "05/08/2026",
      descricao: "NF 042 - Sprint de agosto",
      valor: "15000,00",
      tipo: "ENTRADA",
      categoria: "Projetos",
      cliente: "ACME Ltda",
      socio: "",
      natureza: "",
      data_caixa: "12/08/2026",
      observacoes: "",
    },
    {
      data: "05/08/2026",
      descricao: "Google Workspace",
      valor: "-245,00",
      tipo: "SAIDA",
      categoria: "Ferramentas",
      cliente: "",
      socio: "",
      natureza: "",
      data_caixa: "05/08/2026",
      observacoes: "",
    },
    {
      // Despesa paga do bolso do sócio: vira base de reembolso.
      data: "05/08/2026",
      descricao: "Claude Pro",
      valor: "-120,00",
      tipo: "SAIDA",
      categoria: "Ferramentas",
      cliente: "",
      socio: "Nome do Sócio",
      natureza: "",
      data_caixa: "05/08/2026",
      observacoes: "pago do proprio bolso",
    },
    {
      data: "10/08/2026",
      descricao: "Distribuicao de lucros",
      valor: "-3000,00",
      tipo: "DISTRIBUICAO",
      categoria: "",
      cliente: "",
      socio: "Nome do Sócio",
      natureza: "LUCRO",
      data_caixa: "10/08/2026",
      observacoes: "",
    },
  ];

  return new Response(gerarCSV(exemplo), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="modelo-importacao.csv"',
    },
  });
}
