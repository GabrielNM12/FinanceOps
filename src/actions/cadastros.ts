"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { parseCentavos, parseBps } from "@/lib/money";
import { deInputDate } from "@/lib/datas";
import { gerarLancamentosRecorrentes } from "@/lib/recorrentes";
import { exigirAcesso } from "@/lib/sessao";
import { registrar } from "@/lib/auditoria";
import { normalizarEmail } from "@/lib/acesso";

const texto = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const opcional = (fd: FormData, k: string) => texto(fd, k) || null;

// --- Sócios ---------------------------------------------------------------

export async function criarSocio(fd: FormData) {
  const sessao = await exigirAcesso();
  const nome = texto(fd, "nome");
  if (!nome) throw new Error("Informe o nome do sócio.");

  // O e-mail é a identidade de login, então entra normalizado e único.
  const email = normalizarEmail(texto(fd, "email")) || null;
  if (email) {
    const conflito = await prisma.socio.findFirst({ where: { email } });
    if (conflito) {
      throw new Error(`O e-mail ${email} já está no sócio ${conflito.nome}.`);
    }
  }

  await prisma.socio.create({
    data: {
      nome,
      email,
      participacaoBps: texto(fd, "participacao") ? parseBps(texto(fd, "participacao")) : 0,
    },
  });
  revalidatePath("/configuracoes");
}

export async function atualizarSocio(id: string, fd: FormData) {
  const sessao = await exigirAcesso();
  await prisma.socio.update({
    where: { id },
    data: {
      nome: texto(fd, "nome"),
      email: opcional(fd, "email"),
      participacaoBps: parseBps(texto(fd, "participacao") || "0"),
      ativo: fd.get("ativo") === "on",
    },
  });
  revalidatePath("/configuracoes");
}

/**
 * Troca o e-mail de um sócio — que é a identidade de login dele.
 *
 * Duas coisas acontecem juntas:
 *
 * 1. O e-mail muda no sócio.
 * 2. Os links de acesso pendentes do endereço ANTIGO são apagados. Sem isso, um
 *    link já enviado continuaria valendo — e o dono daquela caixa de entrada
 *    pode ser um ex-sócio ou uma conta que a pessoa perdeu.
 *
 * A sessão aberta do endereço antigo não precisa de tratamento: ela é um cookie
 * assinado, e `sessaoAtual()` confere a cada requisição se o e-mail ainda
 * pertence a um sócio ativo. Como o endereço deixou de existir no cadastro, o
 * acesso cai na requisição seguinte.
 */
export async function alterarEmailSocio(id: string, emailBruto: string) {
  const sessao = await exigirAcesso();

  const socio = await prisma.socio.findUnique({ where: { id } });
  if (!socio) throw new Error("Sócio não encontrado.");

  const novo = normalizarEmail(emailBruto);
  const antigo = normalizarEmail(socio.email);

  if (novo && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(novo)) {
    throw new Error("E-mail inválido.");
  }
  if (novo === antigo) return;

  if (novo) {
    const conflito = await prisma.socio.findFirst({
      where: { email: novo, NOT: { id } },
    });
    if (conflito) {
      throw new Error(
        `O e-mail ${novo} já está no sócio ${conflito.nome}. Cada endereço pertence a uma pessoa só.`
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.socio.update({
      where: { id },
      data: { email: novo || null },
    });

    if (antigo) {
      await tx.tokenAcesso.deleteMany({ where: { email: antigo } });
    }
  });

  await registrar(sessao, {
    acao: "ATUALIZAR",
    entidade: "SOCIO",
    entidadeId: id,
    resumo: `Alterou o e-mail de acesso de ${socio.nome}: ${antigo || "(vazio)"} -> ${novo || "(vazio)"}`,
  });

  revalidarCadastros();
}

export async function excluirSocio(id: string) {
  const sessao = await exigirAcesso();
  const usos = await prisma.distribuicao.count({ where: { socioId: id } });
  if (usos > 0) {
    // Apagar levaria embora o histórico de quem recebeu o quê — justamente o
    // dado que o sistema existe para preservar. Inativa em vez de excluir.
    await prisma.socio.update({ where: { id }, data: { ativo: false } });
  } else {
    await prisma.socio.delete({ where: { id } });
  }
  revalidatePath("/configuracoes");
}

// --- Clientes -------------------------------------------------------------
// Cadastro simples, no mesmo espírito de Categoria: só o nome.

export async function criarCliente(fd: FormData) {
  const sessao = await exigirAcesso();
  const nome = texto(fd, "nome");
  if (!nome) throw new Error("Informe o nome do cliente.");

  const jaExiste = await prisma.cliente.findFirst({ where: { nome } });
  if (jaExiste) throw new Error(`O cliente "${nome}" já está cadastrado.`);

  await prisma.cliente.create({ data: { nome } });
  revalidarCadastros();
}

export async function renomearCliente(id: string, nome: string) {
  const sessao = await exigirAcesso();
  if (!nome.trim()) throw new Error("Informe o nome do cliente.");
  await prisma.cliente.update({ where: { id }, data: { nome: nome.trim() } });
  revalidarCadastros();
}

export async function alternarCliente(id: string, ativo: boolean) {
  const sessao = await exigirAcesso();
  await prisma.cliente.update({ where: { id }, data: { ativo } });
  revalidarCadastros();
}

export async function excluirCliente(id: string) {
  const sessao = await exigirAcesso();
  const usos = await prisma.transacao.count({ where: { clienteId: id } });
  if (usos > 0) {
    // Excluir zeraria o cliente das receitas (onDelete: SetNull) e a análise de
    // margem perderia o histórico. Inativar preserva os números e some do form.
    await prisma.cliente.update({ where: { id }, data: { ativo: false } });
  } else {
    await prisma.cliente.delete({ where: { id } });
  }
  revalidarCadastros();
}

function revalidarCadastros() {
  for (const p of ["/", "/configuracoes", "/transacoes"]) revalidatePath(p);
}

// --- Categorias -----------------------------------------------------------

export async function criarCategoria(fd: FormData) {
  const sessao = await exigirAcesso();
  await prisma.categoria.create({
    data: {
      nome: texto(fd, "nome"),
      natureza: texto(fd, "natureza") || "SAIDA",
      cor: texto(fd, "cor") || "#2eb3c7",
    },
  });
  revalidatePath("/configuracoes");
}

export async function excluirCategoria(id: string) {
  const sessao = await exigirAcesso();
  const cat = await prisma.categoria.findUnique({ where: { id } });
  if (cat?.ehImposto) {
    throw new Error("A categoria de impostos não pode ser excluída.");
  }
  await prisma.categoria.delete({ where: { id } });
  revalidatePath("/configuracoes");
}

// --- Recorrentes ----------------------------------------------------------

export async function criarRecorrente(fd: FormData) {
  const sessao = await exigirAcesso();
  const valor = parseCentavos(texto(fd, "valor"));
  if (valor <= 0) throw new Error("Informe um valor maior que zero.");

  await prisma.recorrente.create({
    data: {
      descricao: texto(fd, "descricao"),
      tipo: texto(fd, "tipo") || "SAIDA",
      valorCentavos: valor,
      categoriaId: opcional(fd, "categoriaId"),
      diaVencimento: Number(texto(fd, "diaVencimento") || 1),
      inicio: deInputDate(texto(fd, "inicio")),
      fim: texto(fd, "fim") ? deInputDate(texto(fd, "fim")) : null,
      observacoes: opcional(fd, "observacoes"),
    },
  });

  // Materializa na hora: cadastrar um recorrente que começou há 3 meses deve
  // trazer os 3 lançamentos, não esperar o próximo mês.
  await gerarLancamentosRecorrentes();

  revalidatePath("/recorrentes");
  revalidatePath("/transacoes");
  revalidatePath("/");
}

export async function alternarRecorrente(id: string, ativo: boolean) {
  const sessao = await exigirAcesso();
  await prisma.recorrente.update({ where: { id }, data: { ativo } });
  revalidatePath("/recorrentes");
}

export async function excluirRecorrente(id: string) {
  const sessao = await exigirAcesso();
  // Os lançamentos já gerados ficam (viraram fato). Só a regra some.
  await prisma.recorrente.delete({ where: { id } });
  revalidatePath("/recorrentes");
  revalidatePath("/transacoes");
}

export async function gerarRecorrentesAgora() {
  const sessao = await exigirAcesso();
  const r = await gerarLancamentosRecorrentes();
  revalidatePath("/recorrentes");
  revalidatePath("/transacoes");
  revalidatePath("/");
  return r;
}
