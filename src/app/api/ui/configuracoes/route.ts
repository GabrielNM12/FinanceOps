import { prisma } from "@/lib/db";
import { distribuicaoPorSocio, margemPorCliente } from "@/lib/queries";
import { exigirSocio } from "@/lib/sessao";

export const dynamic = "force-dynamic";

export async function GET() {
  const sessao = await exigirSocio();
  if (sessao instanceof Response) return sessao;

  try {
    const [faixas, categorias, configs, socios, clientes, resumoSocios] =
      await Promise.all([
        prisma.faixaSimples.findMany({ orderBy: [{ anexo: "asc" }, { faixa: "asc" }] }),
        prisma.categoria.findMany({ orderBy: [{ natureza: "asc" }, { nome: "asc" }] }),
        prisma.config.findMany(),
        prisma.socio.findMany({ orderBy: { nome: "asc" } }),
        margemPorCliente(),
        distribuicaoPorSocio(),
      ]);

    const remuneracao = new Map(
      resumoSocios.map((s) => [s.id, s.totalRemuneracaoCentavos])
    );

    return Response.json({
      config: Object.fromEntries(configs.map((c) => [c.chave, c.valor])),
      socios: socios.map((s) => ({
        id: s.id,
        nome: s.nome,
        email: s.email,
        participacaoBps: s.participacaoBps,
        ativo: s.ativo,
        recebidoCentavos: remuneracao.get(s.id) ?? 0,
      })),
      somaParticipacaoBps: socios.reduce((s, x) => s + x.participacaoBps, 0),
      clientes,
      categorias,
      faixas,
    });
  } catch (e) {
    return Response.json({ erro: (e as Error).message }, { status: 500 });
  }
}
