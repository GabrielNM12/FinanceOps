import { prisma } from "@/lib/db";
import { exigirSocio } from "@/lib/sessao";

export const dynamic = "force-dynamic";

export async function GET() {
  const sessao = await exigirSocio();
  if (sessao instanceof Response) return sessao;

  try {
    const historico = await prisma.importacao.findMany({
      orderBy: { criadoEm: "desc" },
      take: 20,
    });

    return Response.json({
      historico: historico.map((h) => ({
        id: h.id,
        arquivo: h.arquivo,
        criadoEm: h.criadoEm.toISOString(),
        linhasTotal: h.linhasTotal,
        linhasImportadas: h.linhasImportadas,
        linhasIgnoradas: h.linhasIgnoradas,
      })),
    });
  } catch (e) {
    return Response.json({ erro: (e as Error).message }, { status: 500 });
  }
}
