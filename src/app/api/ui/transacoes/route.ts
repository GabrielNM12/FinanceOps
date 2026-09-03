import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { exigirSocio } from "@/lib/sessao";

export const dynamic = "force-dynamic";

const LIMITE = 300;

export async function GET(req: NextRequest) {
  const sessao = await exigirSocio();
  if (sessao instanceof Response) return sessao;

  try {
    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get("tipo");
    const cliente = searchParams.get("cliente");
    const status = searchParams.get("status");
    const q = searchParams.get("q");

    const where: Record<string, unknown> = {};
    if (tipo) where.tipo = tipo;
    if (cliente) where.clienteId = cliente;
    if (status === "pendente") where.dataCaixa = null;
    if (status === "liquidado") where.dataCaixa = { not: null };
    if (q) where.descricao = { contains: q };

    const [transacoes, clientes, categorias, socios, total] = await Promise.all([
      prisma.transacao.findMany({
        where,
        include: {
          cliente: { select: { nome: true } },
          categoria: { select: { nome: true } },
          socio: { select: { nome: true } },
          criadoPor: { select: { nome: true } },
          impostos: { select: { valorCentavos: true, status: true } },
          // Uma TRANSFERENCIA sozinha não diz a direção; quem sabe é o movimento.
          movimentoCaixinha: {
            select: { tipo: true, caixinha: { select: { nome: true } } },
          },
        },
        orderBy: [{ dataCompetencia: "desc" }, { criadoEm: "desc" }],
        take: LIMITE,
      }),
      prisma.cliente.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
      prisma.categoria.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
      prisma.socio.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
      prisma.transacao.count({ where }),
    ]);

    return Response.json({
      total,
      truncado: total > LIMITE,
      limite: LIMITE,
      transacoes: transacoes.map((t) => ({
        id: t.id,
        tipo: t.tipo,
        descricao: t.descricao,
        valorCentavos: t.valorCentavos,
        dataCompetencia: t.dataCompetencia.toISOString(),
        dataCaixa: t.dataCaixa ? t.dataCaixa.toISOString() : null,
        cliente: t.cliente?.nome ?? null,
        categoria: t.categoria?.nome ?? null,
        socio: t.socio?.nome ?? null,
        criadoPor: t.criadoPor?.nome ?? null,
        recorrente: !!t.recorrenteId,
        caixinha: t.movimentoCaixinha
          ? {
              nome: t.movimentoCaixinha.caixinha.nome,
              tipo: t.movimentoCaixinha.tipo,
            }
          : null,
        impostoCentavos: t.impostos
          .filter((i) => i.status !== "CANCELADO")
          .reduce((s, i) => s + i.valorCentavos, 0),
      })),
      opcoes: {
        clientes: clientes.map((c) => ({ id: c.id, nome: c.nome })),
        categoriasEntrada: categorias
          .filter((c) => c.natureza === "ENTRADA")
          .map((c) => ({ id: c.id, nome: c.nome })),
        categoriasSaida: categorias
          .filter((c) => c.natureza === "SAIDA")
          .map((c) => ({ id: c.id, nome: c.nome })),
        socios: socios.map((s) => ({ id: s.id, nome: s.nome })),
      },
    });
  } catch (e) {
    return Response.json({ erro: (e as Error).message }, { status: 500 });
  }
}
