"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { parseCentavos } from "@/lib/money";
import { deInputDate } from "@/lib/datas";
import { saldoCaixinha, validarMovimento } from "@/lib/caixa";
import { posicaoCaixa } from "@/lib/queries";
import { exigirAcesso } from "@/lib/sessao";
import { registrar } from "@/lib/auditoria";

const texto = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const opcional = (fd: FormData, k: string) => texto(fd, k) || null;

function revalidar() {
  for (const p of ["/", "/caixinhas", "/transacoes"]) revalidatePath(p);
}

// ---------------------------------------------------------------------------
// Cadastro
// ---------------------------------------------------------------------------

export async function criarCaixinha(fd: FormData) {
  const sessao = await exigirAcesso();
  const nome = texto(fd, "nome");
  if (!nome) throw new Error("Dê um nome à caixinha.");

  const jaExiste = await prisma.caixinha.findFirst({ where: { nome } });
  if (jaExiste) throw new Error(`Já existe uma caixinha chamada "${nome}".`);

  const metaTexto = texto(fd, "meta");
  const metaData = texto(fd, "metaData");

  await prisma.caixinha.create({
    data: {
      nome,
      cor: texto(fd, "cor") || "#2eb3c7",
      icone: texto(fd, "icone") || "piggy-bank",
      metaCentavos: metaTexto ? parseCentavos(metaTexto) : null,
      metaData: metaData ? deInputDate(metaData) : null,
      observacoes: opcional(fd, "observacoes"),
    },
  });

  revalidar();
}

export async function atualizarCaixinha(id: string, fd: FormData) {
  const sessao = await exigirAcesso();
  const nome = texto(fd, "nome");
  if (!nome) throw new Error("Dê um nome à caixinha.");

  const conflito = await prisma.caixinha.findFirst({
    where: { nome, NOT: { id } },
  });
  if (conflito) throw new Error(`Já existe uma caixinha chamada "${nome}".`);

  const metaTexto = texto(fd, "meta");
  const metaData = texto(fd, "metaData");

  await prisma.caixinha.update({
    where: { id },
    data: {
      nome,
      cor: texto(fd, "cor") || "#2eb3c7",
      icone: texto(fd, "icone") || "piggy-bank",
      // Meta em branco apaga a meta — é assim que se remove o objetivo.
      metaCentavos: metaTexto ? parseCentavos(metaTexto) : null,
      metaData: metaData ? deInputDate(metaData) : null,
      observacoes: opcional(fd, "observacoes"),
    },
  });

  revalidar();
}

export async function arquivarCaixinha(id: string, ativa: boolean) {
  const sessao = await exigirAcesso();
  if (!ativa) {
    const saldo = await saldoDe(id);
    if (saldo !== 0) {
      throw new Error(
        "Resgate todo o dinheiro antes de arquivar — caixinha arquivada com saldo some do painel e o dinheiro fica invisível."
      );
    }
  }
  await prisma.caixinha.update({ where: { id }, data: { ativa } });
  revalidar();
}

/**
 * Exclusão só com saldo zero e sem histórico.
 *
 * Com histórico, apagar levaria embora as TRANSFERENCIAS do extrato (cascade) e
 * o saldo em conta mudaria retroativamente sem explicação. Nesse caso, arquive.
 */
export async function excluirCaixinha(id: string) {
  const sessao = await exigirAcesso();
  const [saldo, movimentos] = await Promise.all([
    saldoDe(id),
    prisma.movimentoCaixinha.count({ where: { caixinhaId: id } }),
  ]);

  if (saldo !== 0) throw new Error("Resgate todo o dinheiro antes de excluir.");
  if (movimentos > 0) {
    throw new Error(
      "Esta caixinha tem histórico. Arquive em vez de excluir — apagar removeria as transferências do extrato e mudaria o saldo em conta retroativamente."
    );
  }

  await prisma.caixinha.delete({ where: { id } });
  revalidar();
}

// ---------------------------------------------------------------------------
// Movimentos
// ---------------------------------------------------------------------------

async function saldoDe(caixinhaId: string) {
  const movs = await prisma.movimentoCaixinha.findMany({
    where: { caixinhaId },
    select: { tipo: true, valorCentavos: true },
  });
  return saldoCaixinha(movs);
}

/**
 * Guarda ou resgata dinheiro.
 *
 * Grava DOIS registros na mesma transação de banco: o movimento da caixinha
 * (fonte da verdade do saldo) e uma TRANSFERENCIA no ledger (para o extrato do
 * app ficar completo). Se um dos dois falhar, nenhum é gravado — senão o saldo
 * em conta e o extrato divergem, e reconciliar isso depois é um pesadelo.
 */
export async function movimentarCaixinha(fd: FormData) {
  const sessao = await exigirAcesso();
  const caixinhaId = texto(fd, "caixinhaId");
  const tipo = texto(fd, "tipo") === "RESGATE" ? "RESGATE" : "DEPOSITO";
  const valor = parseCentavos(texto(fd, "valor"));
  const data = texto(fd, "data") ? deInputDate(texto(fd, "data")) : new Date();

  const caixinha = await prisma.caixinha.findUnique({ where: { id: caixinhaId } });
  if (!caixinha) throw new Error("Caixinha não encontrada.");

  const [posicao, saldoAtual] = await Promise.all([
    posicaoCaixa(),
    saldoDe(caixinhaId),
  ]);

  const erro = validarMovimento(
    tipo,
    valor,
    posicao.saldoContaCentavos,
    saldoAtual
  );
  if (erro) throw new Error(erro);

  const descricao =
    opcional(fd, "descricao") ??
    `${tipo === "DEPOSITO" ? "Guardado em" : "Resgatado de"} ${caixinha.nome}`;

  await prisma.$transaction(async (tx) => {
    const t = await tx.transacao.create({
      data: {
        tipo: "TRANSFERENCIA",
        descricao,
        valorCentavos: valor,
        dataCompetencia: data,
        dataCaixa: data,
        observacoes:
          tipo === "DEPOSITO"
            ? "Transferência da conta para a caixinha"
            : "Transferência da caixinha para a conta",
      },
    });

    await tx.movimentoCaixinha.create({
      data: {
        caixinhaId,
        tipo,
        valorCentavos: valor,
        data,
        descricao: opcional(fd, "descricao"),
        transacaoId: t.id,
      },
    });
  });

  await registrar(sessao, {
    acao: tipo === "DEPOSITO" ? "GUARDAR" : "RESGATAR",
    entidade: "CAIXINHA",
    entidadeId: caixinhaId,
    resumo: `${tipo === "DEPOSITO" ? "Guardou em" : "Resgatou de"} "${caixinha.nome}"`,
    valorCentavos: valor,
  });

  revalidar();

  const novoSaldo = tipo === "DEPOSITO" ? saldoAtual + valor : saldoAtual - valor;
  return { saldoCentavos: novoSaldo, nome: caixinha.nome };
}

/** Desfaz um movimento e a transferência que o espelha, juntos. */
export async function excluirMovimento(id: string) {
  const sessao = await exigirAcesso();
  const mov = await prisma.movimentoCaixinha.findUnique({ where: { id } });
  if (!mov) throw new Error("Movimento não encontrado.");

  // Desfazer um resgate devolve dinheiro para a caixinha, então nunca deixa
  // saldo negativo. Desfazer um depósito, sim: se o dinheiro já foi resgatado,
  // remover a entrada deixaria a caixinha devendo.
  if (mov.tipo === "DEPOSITO") {
    const saldo = await saldoDe(mov.caixinhaId);
    if (saldo - mov.valorCentavos < 0) {
      throw new Error(
        "Excluir este depósito deixaria a caixinha com saldo negativo. Desfaça os resgates posteriores primeiro."
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.movimentoCaixinha.delete({ where: { id } });
    if (mov.transacaoId) {
      await tx.transacao.delete({ where: { id: mov.transacaoId } });
    }
  });

  revalidar();
}
