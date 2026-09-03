import { prisma } from "@/lib/db";
import { exigirSocio } from "@/lib/sessao";

export const dynamic = "force-dynamic";

export async function GET() {
  const sessao = await exigirSocio();
  if (sessao instanceof Response) return sessao;

  try {
    const [recorrentes, categorias] = await Promise.all([
      prisma.recorrente.findMany({
        include: {
          categoria: { select: { nome: true } },
          _count: { select: { lancamentos: true } },
        },
        orderBy: [{ ativo: "desc" }, { descricao: "asc" }],
      }),
      prisma.categoria.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    ]);

    const ativos = recorrentes.filter((r) => r.ativo);
    const soma = (tipo: string) =>
      ativos.filter((r) => r.tipo === tipo).reduce((s, r) => s + r.valorCentavos, 0);

    return Response.json({
      totais: { entradaCentavos: soma("ENTRADA"), saidaCentavos: soma("SAIDA") },
      recorrentes: recorrentes.map((r) => ({
        id: r.id,
        descricao: r.descricao,
        tipo: r.tipo,
        valorCentavos: r.valorCentavos,
        categoria: r.categoria?.nome ?? null,
        diaVencimento: r.diaVencimento,
        inicio: r.inicio.toISOString(),
        fim: r.fim ? r.fim.toISOString() : null,
        ativo: r.ativo,
        gerados: r._count.lancamentos,
      })),
      categorias: categorias.map((c) => ({ id: c.id, nome: c.nome })),
    });
  } catch (e) {
    return Response.json({ erro: (e as Error).message }, { status: 500 });
  }
}
