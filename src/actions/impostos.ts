"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { deInputDate } from "@/lib/datas";
import { calcularAliquota } from "@/lib/simples";
import { aplicarBps } from "@/lib/money";
import { exigirAcesso } from "@/lib/sessao";
import { registrar } from "@/lib/auditoria";

function revalidar() {
  for (const p of ["/", "/impostos", "/transacoes"]) revalidatePath(p);
}

/** Categoria usada para lançar a guia. Criada na hora se não existir. */
async function categoriaImposto() {
  const existente = await prisma.categoria.findFirst({ where: { ehImposto: true } });
  if (existente) return existente;
  return prisma.categoria.create({
    data: { nome: "Impostos (DAS)", natureza: "SAIDA", ehImposto: true, cor: "#ef4444" },
  });
}

/**
 * Paga uma ou mais guias provisionadas.
 *
 * Gera UMA saída de caixa para o conjunto — porque o DAS é uma guia só, com N
 * receitas dentro. Criar uma saída por receita faria o extrato do app divergir
 * do extrato do banco.
 */
export async function pagarImpostos(ids: string[], dataPagamentoISO: string) {
  const sessao = await exigirAcesso();
  if (ids.length === 0) throw new Error("Selecione ao menos uma guia.");

  const dataPagamento = deInputDate(dataPagamentoISO);
  const categoria = await categoriaImposto();
  // Preenchidos dentro da transação e lidos depois dela, para a auditoria
  // registrar o que de fato foi gravado — não o que se pretendia gravar.
  let totalPago = 0;
  let qtd = 0;

  await prisma.$transaction(async (tx) => {
    const guias = await tx.imposto.findMany({
      where: { id: { in: ids }, status: "PROVISIONADO" },
    });
    if (guias.length === 0) throw new Error("Nenhuma guia provisionada encontrada.");

    const soma = guias.reduce((s, g) => s + g.valorCentavos, 0);

    const saida = await tx.transacao.create({
      data: {
        criadoPorId: sessao.socio?.id ?? null,
        tipo: "SAIDA",
        descricao: `DAS — ${guias.length} lançamento(s)`,
        valorCentavos: soma,
        categoriaId: categoria.id,
        dataCompetencia: dataPagamento,
        dataCaixa: dataPagamento,
        observacoes: "Guia de imposto gerada a partir de provisões.",
      },
    });

    await tx.imposto.updateMany({
      where: { id: { in: guias.map((g) => g.id) } },
      data: { status: "PAGO", pagamentoId: saida.id },
    });

    totalPago = saida.valorCentavos;
    qtd = guias.length;
  });

  await registrar(sessao, {
    acao: "PAGAR",
    entidade: "IMPOSTO",
    resumo: `Pagou ${qtd} guia(s) de DAS em ${dataPagamentoISO.split("-").reverse().join("/")}`,
    valorCentavos: totalPago,
  });

  revalidar();
}

/** Estorna a guia: apaga a saída de caixa e devolve as provisões. */
export async function estornarPagamento(pagamentoId: string) {
  const sessao = await exigirAcesso();
  await prisma.$transaction(async (tx) => {
    await tx.imposto.updateMany({
      where: { pagamentoId },
      data: { status: "PROVISIONADO", pagamentoId: null },
    });
    await tx.transacao.delete({ where: { id: pagamentoId } });
  });

  await registrar(sessao, {
    acao: "ESTORNAR",
    entidade: "IMPOSTO",
    entidadeId: pagamentoId,
    resumo: `Estornou uma guia paga — as provisões voltaram a aberto`,
  });

  revalidar();
}

/**
 * Recalcula provisões ainda em aberto com a alíquota vigente hoje.
 *
 * Serve para depois de lançar receitas fora de ordem, ou de corrigir as faixas.
 * Guias PAGAS nunca são tocadas — histórico não se reescreve.
 */
export async function recalcularProvisoes() {
  const sessao = await exigirAcesso();
  const abertas = await prisma.imposto.findMany({
    where: { status: "PROVISIONADO" },
    include: { receita: true },
  });

  let alterados = 0;

  for (const g of abertas) {
    const calc = await calcularAliquota(g.receita.dataCompetencia);
    const novo = aplicarBps(g.receita.valorCentavos, calc.aliquotaBps);
    if (novo === g.valorCentavos && calc.aliquotaBps === g.aliquotaBps) continue;

    await prisma.imposto.update({
      where: { id: g.id },
      data: {
        valorCentavos: novo,
        aliquotaBps: calc.aliquotaBps,
        anexo: calc.anexo,
        rbt12Centavos: calc.rbt12Centavos,
      },
    });
    alterados++;
  }

  await registrar(sessao, {
    acao: "ATUALIZAR",
    entidade: "IMPOSTO",
    resumo: `Recalculou provisões: ${alterados} de ${abertas.length} alteradas`,
  });

  revalidar();
  return { alterados, total: abertas.length };
}

export async function ajustarProvisao(id: string, valorCentavos: number) {
  const sessao = await exigirAcesso();
  if (valorCentavos < 0) throw new Error("Valor inválido.");
  await prisma.imposto.update({
    where: { id },
    data: { valorCentavos, aliquotaBps: null },
  });
  revalidar();
}

export async function cancelarProvisao(id: string) {
  const sessao = await exigirAcesso();
  await prisma.imposto.update({ where: { id }, data: { status: "CANCELADO" } });
  revalidar();
}

/** Atualiza uma faixa do Simples (tela de configurações). */
export async function atualizarFaixa(
  id: string,
  aliquotaNominalBps: number,
  deducaoCentavos: number
) {
  const sessao = await exigirAcesso();
  await prisma.faixaSimples.update({
    where: { id },
    data: { aliquotaNominalBps, deducaoCentavos },
  });
  revalidatePath("/configuracoes");
  revalidar();
}

export async function definirConfig(chave: string, valor: string) {
  const sessao = await exigirAcesso();
  await prisma.config.upsert({
    where: { chave },
    update: { valor },
    create: { chave, valor },
  });
  revalidatePath("/configuracoes");
  revalidar();
}
