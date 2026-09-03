/**
 * Backup executável dentro do container.
 *
 * O `scripts/backup.ts` é TypeScript e depende do `tsx`, que é devDependency e
 * não existe na imagem de produção. Este faz o mesmo em JavaScript puro.
 *
 * Gera o `.json` (restaurável em Importar -> Backup completo) e o `.db`
 * consistente via `VACUUM INTO`. O CSV fica de fora: ele é para leitura humana,
 * e quem roda isto num container quer o arquivo que restaura.
 */
import { PrismaClient } from "@prisma/client";
import { mkdirSync, existsSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();
const VERSAO_BACKUP = 1;

function carimbo() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

async function main() {
  const destino = process.env.BACKUP_DIR || "/dados/backups";
  if (!existsSync(destino)) mkdirSync(destino, { recursive: true });

  const nome = `financeops-backup-${carimbo()}`;

  const dados = {
    config: await prisma.config.findMany(),
    faixasSimples: await prisma.faixaSimples.findMany(),
    socios: await prisma.socio.findMany(),
    clientes: await prisma.cliente.findMany(),
    categorias: await prisma.categoria.findMany(),
    caixinhas: await prisma.caixinha.findMany(),
    recorrentes: await prisma.recorrente.findMany(),
    importacoes: await prisma.importacao.findMany(),
    transacoes: await prisma.transacao.findMany(),
    impostos: await prisma.imposto.findMany(),
    distribuicoes: await prisma.distribuicao.findMany(),
    movimentosCaixinha: await prisma.movimentoCaixinha.findMany(),
    auditoria: await prisma.auditoria.findMany(),
  };

  const resumo = Object.fromEntries(
    Object.entries(dados).map(([k, v]) => [k, v.length])
  );
  const total = Object.values(resumo).reduce((s, n) => s + n, 0);

  const caminhoJson = join(destino, `${nome}.json`);
  writeFileSync(
    caminhoJson,
    JSON.stringify(
      {
        financeops: {
          versao: VERSAO_BACKUP,
          geradoEm: new Date().toISOString(),
          observacao:
            "Backup completo do FinanceOps. Restaure em Importar -> Backup completo.",
        },
        resumo,
        dados,
      },
      null,
      2
    ),
    "utf8"
  );
  console.log(`[FinanceOps] JSON: ${caminhoJson} (${total} registros)`);

  // Cópia binária consistente, mesmo com o app no ar. Copiar o .db na mão
  // poderia pegar um estado sem as transações que ainda estão no WAL.
  const caminhoDb = join(destino, `${nome}.db`);
  await prisma.$executeRawUnsafe(`VACUUM INTO '${caminhoDb}'`);
  console.log(
    `[FinanceOps] DB:   ${caminhoDb} (${(statSync(caminhoDb).size / 1024).toFixed(0)} KB)`
  );
}

main()
  .catch((e) => {
    console.error("[FinanceOps] backup falhou:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
