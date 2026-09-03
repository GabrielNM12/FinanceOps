import { prisma } from "@/lib/db";
import type { Autenticado } from "@/lib/sessao";
import type { RegistroAuditoria } from "@/lib/auditoria-formato";

/**
 * Gravação da trilha de auditoria. Só o servidor usa este arquivo.
 *
 * Os rótulos e cores ficam em `auditoria-formato.ts`, que é puro — a tela é
 * client component e não pode arrastar o Prisma para o navegador.
 *
 * DUAS COISAS DIFERENTES, de propósito:
 *
 * - `Transacao.criadoPorId` responde "quem lançou isto?" direto na linha, sem
 *   join. É o que aparece na lista de lançamentos e o que permite filtrar.
 * - `fin_auditoria` responde "o que aconteceu no sistema?", inclusive o que não
 *   cria lançamento: guia paga, importação, restauração de backup, troca de
 *   e-mail de acesso, exclusão.
 *
 * Um substituindo o outro deixaria buraco: só o campo no ledger perde as
 * exclusões (o registro some e leva o autor junto); só a trilha obriga um join
 * por linha para exibir a lista.
 */

export * from "@/lib/auditoria-formato";

/**
 * Grava um evento. **Nunca lança.**
 *
 * Se a auditoria falhar, a operação de negócio já aconteceu — derrubar a
 * requisição depois disso deixaria o usuário achando que nada foi salvo, quando
 * na verdade foi. Perder uma linha de log é ruim; perder a confiança no que a
 * tela diz é pior.
 *
 * Fica FORA da transação de banco da operação pelo mesmo motivo: um erro de
 * escrita aqui não pode desfazer um lançamento válido.
 */
export async function registrar(
  sessao: Autenticado,
  evento: RegistroAuditoria
): Promise<void> {
  try {
    await prisma.auditoria.create({
      data: {
        socioId: sessao.socio?.id ?? null,
        email: sessao.email,
        acao: evento.acao,
        entidade: evento.entidade,
        entidadeId: evento.entidadeId ?? null,
        resumo: evento.resumo,
        valorCentavos: evento.valorCentavos ?? null,
      },
    });
  } catch (e) {
    console.error("[FinanceOps] falha ao gravar auditoria:", e, evento);
  }
}
