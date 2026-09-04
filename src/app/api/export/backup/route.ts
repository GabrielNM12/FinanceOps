import { prisma } from "@/lib/db";
import { VERSAO_BACKUP, contar, type DadosBackup } from "@/lib/backup";
import { exigirSocio } from "@/lib/sessao";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

/**
 * GET /api/export/backup — dump completo, restaurável em Importar → Backup.
 *
 * Sem paginação de propósito: um backup parcial é pior que nenhum, porque passa
 * a sensação de estar protegido. Se um dia o volume incomodar, o caminho é
 * comprimir, não fatiar.
 */
export async function GET() {
  const sessao = await exigirSocio();
  if (sessao instanceof Response) return sessao;

  try {
    const [
      config,
      faixasSimples,
      socios,
      clientes,
      categorias,
      caixinhas,
      recorrentes,
      importacoes,
      transacoes,
      impostos,
      distribuicoes,
      movimentosCaixinha,
      auditoria,
    ] = await Promise.all([
      prisma.config.findMany(),
      prisma.faixaSimples.findMany(),
      prisma.socio.findMany(),
      prisma.cliente.findMany(),
      prisma.categoria.findMany(),
      prisma.caixinha.findMany(),
      prisma.recorrente.findMany(),
      prisma.importacao.findMany(),
      prisma.transacao.findMany(),
      prisma.imposto.findMany(),
      prisma.distribuicao.findMany(),
      prisma.movimentoCaixinha.findMany(),
      prisma.auditoria.findMany(),
    ]);

    const dados: DadosBackup = {
      config,
      faixasSimples,
      socios,
      clientes,
      categorias,
      caixinhas,
      recorrentes,
      importacoes,
      transacoes,
      impostos,
      distribuicoes,
      movimentosCaixinha,
      auditoria,
    };

    const corpo = {
      financeops: {
        versao: VERSAO_BACKUP,
        geradoEm: new Date().toISOString(),
        observacao: t.backup.observacaoArquivo,
      },
      resumo: contar(dados),
      dados,
    };

    const nome = `financeops-backup-${new Date().toISOString().slice(0, 10)}.json`;

    return new Response(JSON.stringify(corpo, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${nome}"`,
      },
    });
  } catch (e) {
    return Response.json({ erro: (e as Error).message }, { status: 500 });
  }
}
