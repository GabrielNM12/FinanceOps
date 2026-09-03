import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { verificarToken, erro } from "@/lib/api-auth";
import { vencimentoDAS, deInputDate } from "@/lib/datas";
import { calcularAliquota, diaVencimentoDAS } from "@/lib/simples";
import { aplicarBps } from "@/lib/money";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/transacoes
 *
 * Query: ?de=YYYY-MM-DD&ate=YYYY-MM-DD&tipo=ENTRADA&clienteId=...&limite=100
 *
 * Todos os valores saem em CENTAVOS (inteiro). O consumidor divide por 100 só
 * na hora de exibir — devolver float aqui reintroduziria o erro de arredondamento
 * que o sistema inteiro evita.
 */
export async function GET(req: NextRequest) {
  const negado = verificarToken(req);
  if (negado) return negado;

  const { searchParams } = new URL(req.url);
  const limite = Math.min(Number(searchParams.get("limite") ?? 200), 1000);

  const where: Record<string, unknown> = {};
  const tipo = searchParams.get("tipo");
  const clienteId = searchParams.get("clienteId");
  const de = searchParams.get("de");
  const ate = searchParams.get("ate");

  if (tipo) where.tipo = tipo;
  if (clienteId) where.clienteId = clienteId;
  if (de || ate) {
    where.dataCompetencia = {
      ...(de ? { gte: new Date(`${de}T00:00:00Z`) } : {}),
      ...(ate ? { lte: new Date(`${ate}T23:59:59Z`) } : {}),
    };
  }

  const dados = await prisma.transacao.findMany({
    where,
    include: {
      cliente: { select: { id: true, nome: true } },
      categoria: { select: { id: true, nome: true } },
      socio: { select: { id: true, nome: true } },
      impostos: { select: { id: true, valorCentavos: true, status: true, vencimento: true } },
    },
    orderBy: { dataCompetencia: "desc" },
    take: limite,
  });

  return Response.json({ total: dados.length, dados });
}

/**
 * POST /api/v1/transacoes
 *
 * Corpo:
 * {
 *   "tipo": "ENTRADA",
 *   "descricao": "NF 042",
 *   "valorCentavos": 1500000,
 *   "dataCompetencia": "2026-08-05",
 *   "dataCaixa": "2026-08-12",       // opcional
 *   "clienteId": "...",              // opcional
 *   "categoriaId": "...",            // opcional
 *   "provisionarImposto": true,      // default: true para ENTRADA
 *   "referenciaExterna": "fatura-991" // opcional, vira chave de idempotência
 * }
 *
 * `referenciaExterna` é gravada no mesmo campo do hash de importação, que é
 * unique. Reenviar o mesmo POST devolve 409 em vez de duplicar o lançamento —
 * importante porque integração com retry é a origem mais comum de duplicidade.
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

  const tipo = String(body.tipo ?? "");
  if (!["ENTRADA", "SAIDA", "DISTRIBUICAO", "APORTE"].includes(tipo)) {
    // TRANSFERENCIA fica de fora de propósito: ela só existe amarrada a um
    // movimento de caixinha, e criar uma solta por aqui deixaria o saldo em
    // conta divergente do total guardado.
    return erro(
      "Campo 'tipo' deve ser ENTRADA, SAIDA, DISTRIBUICAO ou APORTE. " +
        "Transferências entre conta e caixinha não são criadas por esta rota."
    );
  }

  const valorCentavos = Number(body.valorCentavos);
  if (!Number.isInteger(valorCentavos) || valorCentavos <= 0) {
    return erro("Campo 'valorCentavos' deve ser inteiro positivo (em centavos).");
  }

  const descricao = String(body.descricao ?? "").trim();
  if (!descricao) return erro("Campo 'descricao' é obrigatório.");

  const dataCompetenciaRaw = String(body.dataCompetencia ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataCompetenciaRaw)) {
    return erro("Campo 'dataCompetencia' deve estar no formato YYYY-MM-DD.");
  }
  const dataCompetencia = deInputDate(dataCompetenciaRaw);

  const referencia = body.referenciaExterna ? String(body.referenciaExterna) : null;
  if (referencia) {
    const jaExiste = await prisma.transacao.findUnique({
      where: { hashImportacao: referencia },
      select: { id: true },
    });
    if (jaExiste) {
      return Response.json(
        { erro: "Já existe lançamento com esta referenciaExterna.", id: jaExiste.id },
        { status: 409 }
      );
    }
  }

  const provisionar =
    tipo === "ENTRADA" && (body.provisionarImposto ?? true) !== false;

  try {
    const criada = await prisma.$transaction(async (tx) => {
      const t = await tx.transacao.create({
        data: {
          tipo,
          descricao,
          valorCentavos,
          dataCompetencia,
          dataCaixa: body.dataCaixa ? deInputDate(String(body.dataCaixa)) : null,
          clienteId: body.clienteId ? String(body.clienteId) : null,
          categoriaId: body.categoriaId ? String(body.categoriaId) : null,
          socioId: body.socioId ? String(body.socioId) : null,
          observacoes: body.observacoes ? String(body.observacoes) : null,
          hashImportacao: referencia,
        },
      });

      if (provisionar) {
        const calc = await calcularAliquota(dataCompetencia);
        const valor = aplicarBps(valorCentavos, calc.aliquotaBps);
        if (valor > 0) {
          await tx.imposto.create({
            data: {
              receitaId: t.id,
              tipo: "DAS",
              aliquotaBps: calc.aliquotaBps,
              valorCentavos: valor,
              anexo: calc.anexo,
              rbt12Centavos: calc.rbt12Centavos,
              vencimento: vencimentoDAS(dataCompetencia, await diaVencimentoDAS()),
            },
          });
        }
      }

      return tx.transacao.findUnique({
        where: { id: t.id },
        include: { impostos: true },
      });
    });

    return Response.json(criada, { status: 201 });
  } catch (e) {
    return erro(`Falha ao gravar: ${(e as Error).message}`, 500);
  }
}
