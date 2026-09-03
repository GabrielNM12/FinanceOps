/**
 * Atribui a autoria dos lançamentos antigos a um sócio.
 *
 *     node scripts/retroagir-autoria.mjs                    # padrão: Gabriel Muller
 *     node scripts/retroagir-autoria.mjs "Uelinton Paula"
 *
 * POR QUE ISTO EXISTE:
 * a auditoria entrou depois que o sistema já tinha histórico. Sem retroagir, os
 * lançamentos antigos ficariam com autor vazio — e uma coluna "quem lançou" com
 * metade em branco não responde nada.
 *
 * IDEMPOTENTE: só preenche onde está null. Rodar de novo não reescreve autoria
 * de lançamentos feitos depois, por outras pessoas.
 *
 * O evento de retroação fica registrado na própria trilha, com o texto dizendo
 * que foi atribuição em massa. Auditoria que esconde como os dados chegaram lá
 * é pior do que auditoria nenhuma: dá confiança sem base.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const ALVO = process.argv[2] || "Gabriel Muller";

async function main() {
  const socio = await prisma.socio.findFirst({ where: { nome: ALVO } });
  if (!socio) {
    console.error(`Sócio "${ALVO}" não encontrado. Nomes cadastrados:`);
    for (const s of await prisma.socio.findMany({ orderBy: { nome: "asc" } })) {
      console.error(`  - ${s.nome}`);
    }
    process.exit(1);
  }

  const semAutor = await prisma.transacao.count({ where: { criadoPorId: null } });
  if (semAutor === 0) {
    console.log("Nenhum lançamento sem autor. Nada a fazer.");
    return;
  }

  const r = await prisma.transacao.updateMany({
    where: { criadoPorId: null },
    data: { criadoPorId: socio.id },
  });

  console.log(`${r.count} lançamento(s) atribuídos a ${socio.nome}.`);

  await prisma.auditoria.create({
    data: {
      socioId: socio.id,
      email: socio.email ?? "sistema",
      acao: "ATUALIZAR",
      entidade: "LANCAMENTO",
      resumo:
        `Atribuição em massa: ${r.count} lançamento(s) sem autor foram ` +
        `vinculados a ${socio.nome} ao ativar a auditoria`,
    },
  });

  const total = await prisma.transacao.count();
  const comAutor = await prisma.transacao.count({
    where: { criadoPorId: { not: null } },
  });
  console.log(`Cobertura de autoria: ${comAutor}/${total} lançamentos.`);
}

main()
  .catch((e) => {
    console.error("Falhou:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
