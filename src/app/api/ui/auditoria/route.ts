import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { exigirSocio } from "@/lib/sessao";

export const dynamic = "force-dynamic";

const LIMITE = 200;

export async function GET(req: NextRequest) {
  const sessao = await exigirSocio();
  if (sessao instanceof Response) return sessao;

  try {
    const { searchParams } = new URL(req.url);
    const socio = searchParams.get("socio");
    const entidade = searchParams.get("entidade");
    const acao = searchParams.get("acao");

    const where: Record<string, unknown> = {};
    if (socio) where.socioId = socio;
    if (entidade) where.entidade = entidade;
    if (acao) where.acao = acao;

    const [registros, total, socios, porPessoa] = await Promise.all([
      prisma.auditoria.findMany({
        where,
        include: { socio: { select: { nome: true } } },
        orderBy: { quando: "desc" },
        take: LIMITE,
      }),
      prisma.auditoria.count({ where }),
      prisma.socio.findMany({
        where: { ativo: true },
        select: { id: true, nome: true },
        orderBy: { nome: "asc" },
      }),
      // Quantos eventos por pessoa, no filtro atual. Responde "quem mexe mais
      // no sistema" sem precisar contar linha a linha na tela.
      prisma.auditoria.groupBy({
        by: ["socioId", "email"],
        _count: { _all: true },
        where,
      }),
    ]);

    const nomePorId = new Map(socios.map((s) => [s.id, s.nome]));

    return Response.json({
      total,
      truncado: total > LIMITE,
      limite: LIMITE,
      registros: registros.map((r) => ({
        id: r.id,
        quando: r.quando.toISOString(),
        autor: r.socio?.nome ?? r.email,
        email: r.email,
        socioId: r.socioId,
        acao: r.acao,
        entidade: r.entidade,
        entidadeId: r.entidadeId,
        resumo: r.resumo,
        valorCentavos: r.valorCentavos,
      })),
      socios,
      porPessoa: porPessoa
        .map((p) => ({
          nome: p.socioId ? nomePorId.get(p.socioId) ?? p.email : p.email,
          quantidade: p._count._all,
        }))
        .sort((a, b) => b.quantidade - a.quantidade),
    });
  } catch (e) {
    return Response.json({ erro: (e as Error).message }, { status: 500 });
  }
}
