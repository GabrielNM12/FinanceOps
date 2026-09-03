import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { verificarToken, erro } from "@/lib/api-auth";
import { margemPorCliente } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** GET /api/v1/clientes — lista com receita, imposto, despesa e margem. */
export async function GET(req: NextRequest) {
  const negado = verificarToken(req);
  if (negado) return negado;
  return Response.json({ dados: await margemPorCliente() });
}

/**
 * POST /api/v1/clientes
 * { "nome": "ACME Ltda" }
 *
 * Idempotente por nome: cliente já existente volta com 200 em vez de criar
 * duplicata. Sincronização vinda de outro sistema roda várias vezes —
 * duplicar aqui quebraria a análise de margem.
 */
export async function POST(req: NextRequest) {
  const negado = verificarToken(req);
  if (negado) return negado;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return erro("Corpo inválido: esperado JSON.");
  }

  const nome = String(body.nome ?? "").trim();
  if (!nome) return erro("Campo 'nome' é obrigatório.");

  const existente = await prisma.cliente.findFirst({ where: { nome } });
  if (existente) return Response.json(existente, { status: 200 });

  const criado = await prisma.cliente.create({ data: { nome } });
  return Response.json(criado, { status: 201 });
}
