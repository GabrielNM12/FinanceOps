/**
 * Backup do banco SQLite.
 *
 * Rode com `npm run db:backup`. Gera `backups/financeops-AAAA-MM-DD-HHmm.db`.
 *
 * POR QUE NÃO É SÓ UM `copyFile`:
 * o SQLite mantém um WAL (write-ahead log) ao lado do arquivo principal. Copiar
 * só o `.db` durante uma escrita pode capturar um estado sem as transações que
 * ainda estão no WAL — o arquivo abre, parece íntegro, e falta o último dia de
 * lançamentos. O comando `VACUUM INTO` do SQLite resolve isso: ele grava um
 * banco novo, consistente, com o app rodando.
 *
 * Também guarda um CSV dos lançamentos junto. Backup binário depende do SQLite
 * para ser lido; o CSV você abre no Excel daqui a cinco anos.
 */
import { PrismaClient } from "@prisma/client";
import { mkdirSync, existsSync, writeFileSync, statSync } from "fs";
import { join } from "path";
import { gerarCSV, centavosParaCSV } from "../src/lib/csv";
import { paraInputDate } from "../src/lib/datas";
import { VERSAO_BACKUP, contar, type DadosBackup } from "../src/lib/backup";

const prisma = new PrismaClient();

function carimbo() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(
    d.getHours()
  )}${p(d.getMinutes())}`;
}

async function main() {
  const destino = join(process.cwd(), "backups");
  if (!existsSync(destino)) mkdirSync(destino, { recursive: true });

  const nome = `financeops-${carimbo()}`;
  const caminhoDb = join(destino, `${nome}.db`);

  // VACUUM INTO exige caminho absoluto e um arquivo que ainda não exista.
  await prisma.$executeRawUnsafe(`VACUUM INTO '${caminhoDb.replace(/\\/g, "/")}'`);
  const tamanho = statSync(caminhoDb).size;
  console.log(`Banco:  ${caminhoDb}  (${(tamanho / 1024).toFixed(0)} KB)`);

  const transacoes = await prisma.transacao.findMany({
    include: { cliente: true, categoria: true, socio: true, distribuicao: true },
    orderBy: { dataCompetencia: "asc" },
  });

  const linhas = transacoes.map((t) => ({
    data: paraInputDate(t.dataCompetencia),
    descricao: t.descricao,
    valor: centavosParaCSV(t.valorCentavos),
    tipo: t.tipo,
    categoria: t.categoria?.nome ?? "",
    cliente: t.cliente?.nome ?? "",
    socio: t.socio?.nome ?? "",
    natureza: t.distribuicao?.natureza ?? "",
    data_caixa: t.dataCaixa ? paraInputDate(t.dataCaixa) : "",
    observacoes: t.observacoes ?? "",
  }));

  const caminhoCsv = join(destino, `${nome}.csv`);
  writeFileSync(caminhoCsv, gerarCSV(linhas), "utf8");
  console.log(`CSV:    ${caminhoCsv}  (${linhas.length} lançamentos)`);

  // O CSV é lossy: não carrega sócios, caixinhas, recorrentes nem as provisões
  // com a alíquota da época. O JSON abaixo é o que realmente restaura o sistema.
  const dados: DadosBackup = {
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
        resumo: contar(dados),
        dados,
      },
      null,
      2
    ),
    "utf8"
  );
  const total = Object.values(contar(dados)).reduce((s, n) => s + n, 0);
  console.log(`JSON:   ${caminhoJson}  (${total} registros, restaurável)`);

  // Conferência mínima: se estes números não baterem com o dashboard, o backup
  // saiu de um estado estranho e não deve ser considerado bom.
  const [entradas, saidas] = await Promise.all([
    prisma.transacao.aggregate({
      _sum: { valorCentavos: true },
      where: { tipo: { in: ["ENTRADA", "APORTE"] }, dataCaixa: { not: null } },
    }),
    prisma.transacao.aggregate({
      _sum: { valorCentavos: true },
      where: { tipo: { in: ["SAIDA", "DISTRIBUICAO"] }, dataCaixa: { not: null } },
    }),
  ]);
  const saldo =
    (entradas._sum.valorCentavos ?? 0) - (saidas._sum.valorCentavos ?? 0);
  console.log(`Saldo no momento do backup: R$ ${(saldo / 100).toFixed(2)}`);
  console.log("\nCopie a pasta backups/ para o Google Drive.");
}

main()
  .catch((e) => {
    console.error("Falha no backup:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
