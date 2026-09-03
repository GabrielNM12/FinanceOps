/**
 * Gera um backup completo com dados FICTÍCIOS, restaurável em
 * Importar -> Backup completo.
 *
 *     node scripts/gerar-mock.mjs
 *
 * PARA QUE SERVE: povoar uma instância de demonstração com 12 meses de
 * movimento, para que as telas e os gráficos tenham forma.
 *
 * POR QUE UM GERADOR, E NÃO UM JSON ESCRITO À MÃO:
 * as provisões de DAS dependem do RBT12, que depende de todas as receitas dos
 * 12 meses anteriores. Escrever isso à mão daria números que *parecem* certos e
 * que a tela de impostos contradiria na primeira conferência. Aqui a alíquota é
 * calculada com a mesma fórmula do app — se você mandar "Recalcular provisões",
 * os valores não mudam.
 *
 * ATENÇÃO — restaurar este arquivo em modo "substituir tudo" APAGA os sócios
 * reais e os e-mails de acesso. Os sócios fictícios usam o domínio `.invalid`,
 * que nunca recebe e-mail: sem AUTH_BOOTSTRAP_EMAIL no .env, ninguém entra
 * depois. Use apenas numa instância de demonstração.
 */
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const R$ = (reais) => Math.round(reais * 100);
const brl = (c) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// --- IDs previsíveis --------------------------------------------------------
// Não são cuid de verdade: são legíveis de propósito. Abrir o JSON e ver
// "tx-2025-10-rec-1" em vez de "cmsqe6i680001r34z0yzfpm0t" é a diferença entre
// conseguir conferir o arquivo e ter que confiar nele.
const id = (...partes) => partes.join("-");

// --- Datas ------------------------------------------------------------------
const dataUTC = (a, m, d) => new Date(Date.UTC(a, m - 1, d));
const iso = (d) => d.toISOString();
const competencia = (a, m) => `${a}-${String(m).padStart(2, "0")}`;
const ultimoDia = (a, m) => new Date(Date.UTC(a, m, 0)).getUTCDate();
const diaSeguro = (a, m, d) => dataUTC(a, m, Math.min(d, ultimoDia(a, m)));

/** Os 12 meses do período: 2025-09 até 2026-08. */
const MESES = [];
for (let i = 0; i < 12; i++) {
  const base = new Date(Date.UTC(2025, 8 + i, 1));
  MESES.push({ ano: base.getUTCFullYear(), mes: base.getUTCMonth() + 1 });
}
const ULTIMO = MESES[MESES.length - 1];

// --- Aleatoriedade reproduzível --------------------------------------------
// Gerador próprio com semente fixa: rodar duas vezes produz o mesmo arquivo.
// Com Math.random, cada execução daria um diff enorme e revisar seria inútil.
let semente = 20260903;
function aleatorio() {
  semente = (semente * 1103515245 + 12345) % 2147483648;
  return semente / 2147483648;
}
const entre = (min, max) => min + Math.floor(aleatorio() * (max - min + 1));
const escolher = (lista) => lista[entre(0, lista.length - 1)];

// --- Cadastros --------------------------------------------------------------

const SOCIOS = [
  "Ana Ribeiro",
  "Bruno Tavares",
  "Camila Nogueira",
  "Diego Fontes",
  "Eduarda Vilela",
  "Felipe Andrade",
].map((nome, i) => ({
  id: id("socio", i + 1),
  nome,
  // `.invalid` é reservado pela RFC 2606 e nunca existe. Impede que este
  // arquivo, restaurado por engano, mande link de acesso para alguém de verdade.
  email: `${nome.split(" ")[0].toLowerCase()}@exemplo.invalid`,
  participacaoBps: 0, // preenchido abaixo, com o resto distribuído
  ativo: true,
  criadoEm: iso(dataUTC(2025, 9, 1)),
}));
{
  const base = Math.trunc(10_000 / SOCIOS.length);
  const resto = 10_000 - base * SOCIOS.length;
  SOCIOS.forEach((s, i) => (s.participacaoBps = base + (i < resto ? 1 : 0)));
}

const CLIENTES = [
  ["Vantiva Log", 1],
  ["Mercadora Sul", 2],
  ["Clínica Perene", 3],
  ["Grupo Aldeia", 4],
  ["Ponte Digital", 5],
  ["Ferrarini Alimentos", 6],
].map(([nome, n]) => ({
  id: id("cli", n),
  nome,
  ativo: true,
  criadoEm: iso(dataUTC(2025, 9, 1)),
}));

const CATEGORIAS = [
  ["Projetos", "ENTRADA", false, "#22c55e"],
  ["Impostos", "SAIDA", true, "#ef4444"],
  ["Ferramentas", "SAIDA", false, "#2eb3c7"],
  ["Contabilidade", "SAIDA", false, "#64748b"],
  ["Escritório", "SAIDA", false, "#0ea5e9"],
  ["Pró-labore", "SAIDA", false, "#a855f7"],
].map(([nome, natureza, ehImposto, cor], i) => ({
  id: id("cat", i + 1),
  nome,
  natureza,
  ehImposto,
  cor,
  ativo: true,
  criadoEm: iso(dataUTC(2025, 9, 1)),
}));
const cat = (nome) => CATEGORIAS.find((c) => c.nome === nome).id;

const FAIXAS = [
  ["III", 1, 0, 180_000, 6.0, 0],
  ["III", 2, 180_000.01, 360_000, 11.2, 9_360],
  ["III", 3, 360_000.01, 720_000, 13.5, 17_640],
  ["III", 4, 720_000.01, 1_800_000, 16.0, 35_640],
  ["III", 5, 1_800_000.01, 3_600_000, 21.0, 125_640],
  ["III", 6, 3_600_000.01, 4_800_000, 33.0, 648_000],
  ["V", 1, 0, 180_000, 15.5, 0],
  ["V", 2, 180_000.01, 360_000, 18.0, 4_500],
  ["V", 3, 360_000.01, 720_000, 19.5, 9_900],
  ["V", 4, 720_000.01, 1_800_000, 20.5, 17_100],
  ["V", 5, 1_800_000.01, 3_600_000, 23.0, 62_100],
  ["V", 6, 3_600_000.01, 4_800_000, 30.5, 540_000],
].map(([anexo, faixa, inf, sup, aliq, ded], i) => ({
  id: id("faixa", i + 1),
  anexo,
  faixa,
  limiteInferiorCentavos: R$(inf),
  limiteSuperiorCentavos: R$(sup),
  aliquotaNominalBps: Math.round(aliq * 100),
  deducaoCentavos: R$(ded),
  vigenciaInicio: iso(dataUTC(2025, 1, 1)),
}));

const CONFIG = [
  { chave: "anexo_simples", valor: "AUTO" },
  { chave: "dia_vencimento_das", valor: "20" },
  { chave: "regime_padrao_dashboard", valor: "COMPETENCIA" },
];

const CAIXINHAS = [
  ["Reserva de emergência", "#f59e0b", "shield", R$(120_000), dataUTC(2026, 12, 31)],
  ["Provisão de impostos", "#ef4444", "landmark", R$(60_000), null],
  ["Equipamentos", "#2eb3c7", "laptop", R$(40_000), dataUTC(2026, 6, 30)],
].map(([nome, cor, icone, metaCentavos, metaData], i) => ({
  id: id("caixinha", i + 1),
  nome,
  cor,
  icone,
  metaCentavos,
  metaData: metaData ? iso(metaData) : null,
  ativa: true,
  observacoes: null,
  criadoEm: iso(dataUTC(2025, 9, 1)),
}));

const RECORRENTES = [
  ["Google Workspace", R$(274.4), "Ferramentas", 14],
  ["Contabilidade mensal", R$(890), "Contabilidade", 5],
  ["Aluguel da sala", R$(2_400), "Escritório", 10],
  ["Figma + Linear", R$(412.5), "Ferramentas", 18],
].map(([descricao, valorCentavos, categoria, dia], i) => ({
  id: id("rec", i + 1),
  descricao,
  tipo: "SAIDA",
  valorCentavos,
  categoriaId: cat(categoria),
  diaVencimento: dia,
  inicio: iso(dataUTC(2025, 9, 1)),
  fim: null,
  ativo: true,
  observacoes: null,
  criadoEm: iso(dataUTC(2025, 9, 1)),
}));

const DESPESAS_AVULSAS = [
  ["Domínios e SSL", R$(430), "Ferramentas"],
  ["Notebook (reposição)", R$(6_800), "Escritório"],
  ["Consultoria jurídica", R$(1_500), "Contabilidade"],
  ["Café e copa", R$(320), "Escritório"],
  ["Licença JetBrains", R$(1_180), "Ferramentas"],
  ["Coworking — diárias", R$(760), "Escritório"],
];

const PROJETOS = [
  "Portal do cliente",
  "Integração ERP",
  "App de campo",
  "Migração de dados",
  "Sustentação mensal",
  "Redesign do checkout",
  "BI de vendas",
  "Automação de faturamento",
];

// --- Acumuladores -----------------------------------------------------------
const transacoes = [];
const impostos = [];
const distribuicoes = [];
const movimentosCaixinha = [];
const auditoria = [];

const carimbo = (d) => iso(d);
const autor = (i) => SOCIOS[i % SOCIOS.length].id;

function lancar(t) {
  transacoes.push({
    origemId: null,
    recorrenteId: null,
    competenciaRef: null,
    hashImportacao: null,
    importacaoId: null,
    clienteId: null,
    categoriaId: null,
    socioId: null,
    observacoes: null,
    ...t,
    criadoEm: t.criadoEm ?? t.dataCompetencia,
    atualizadoEm: t.atualizadoEm ?? t.criadoEm ?? t.dataCompetencia,
  });
  return t.id;
}

// --- Receitas ---------------------------------------------------------------
// Crescimento suave ao longo do ano, para o gráfico ter tendência e não ruído.
let contadorAutor = 0;

for (const { ano, mes } of MESES) {
  const indice = MESES.findIndex((m) => m.ano === ano && m.mes === mes);
  const quantas = indice < 4 ? 2 : indice < 8 ? 3 : 3;

  for (let n = 1; n <= quantas; n++) {
    const cliente = escolher(CLIENTES);
    // Base sobe ~4% ao mês; a variação aleatória impede o gráfico de virar reta.
    const base = 16_000 * Math.pow(1.04, indice);
    const valor = R$(Math.round((base * (0.8 + aleatorio() * 0.5)) / 100) * 100);

    const dataComp = diaSeguro(ano, mes, entre(3, 26));
    // O último mês fica com recebimentos em aberto de propósito: é o estado
    // real de qualquer empresa, e é o que faz a tela de caixa livre ter graça.
    const emAberto = indice === 11 && n >= 2;
    const dataCaixa = emAberto ? null : diaSeguro(ano, mes + (aleatorio() > 0.6 ? 1 : 0), entre(5, 28));

    lancar({
      id: id("tx", competencia(ano, mes), "nf", n),
      tipo: "ENTRADA",
      descricao: `${escolher(PROJETOS)} — ${cliente.nome}`,
      valorCentavos: valor,
      dataCompetencia: carimbo(dataComp),
      dataCaixa: dataCaixa ? carimbo(dataCaixa) : null,
      clienteId: cliente.id,
      categoriaId: cat("Projetos"),
      criadoPorId: autor(contadorAutor++),
    });
  }
}

// --- RBT12 e alíquota, com a mesma conta do app -----------------------------
// janelaRBT12: os 12 meses ANTERIORES ao mês de referência, competência fechada.
function receitasDaJanela(ano, mes) {
  const inicioRef = Date.UTC(ano, mes - 1, 1);
  const de = Date.UTC(ano, mes - 1 - 12, 1);
  const ate = inicioRef - 1;

  const dentro = transacoes.filter((t) => {
    if (t.tipo !== "ENTRADA") return false;
    const d = new Date(t.dataCompetencia).getTime();
    return d >= de && d <= ate;
  });

  const total = dentro.reduce((s, t) => s + t.valorCentavos, 0);
  const mesesAtivos = new Set(
    dentro.map((t) => {
      const d = new Date(t.dataCompetencia);
      return competencia(d.getUTCFullYear(), d.getUTCMonth() + 1);
    })
  ).size;

  // rbt12Proporcional: empresa com menos de 12 meses não fica presa na 1ª faixa.
  if (mesesAtivos <= 0) return 0;
  if (mesesAtivos >= 12) return total;
  return Math.round((total / mesesAtivos) * 12);
}

function folhaDaJanela(ano, mes) {
  const inicioRef = Date.UTC(ano, mes - 1, 1);
  const de = Date.UTC(ano, mes - 1 - 12, 1);
  const ate = inicioRef - 1;

  return distribuicoes
    .filter((d) => d.natureza === "PRO_LABORE")
    .filter((d) => {
      const tx = transacoes.find((t) => t.id === d.transacaoId);
      const q = new Date(tx.dataCompetencia).getTime();
      return q >= de && q <= ate;
    })
    .reduce((s, d) => s + d.valorCentavos, 0);
}

function aliquotaEfetivaBps(rbt12, nominalBps, deducao) {
  if (rbt12 <= 0) return nominalBps;
  const bruto = (rbt12 * nominalBps) / 10_000;
  return Math.max(0, Math.round(((bruto - deducao) / rbt12) * 10_000));
}

function faixaDe(anexo, rbt12) {
  const doAnexo = FAIXAS.filter((f) => f.anexo === anexo).sort((a, b) => a.faixa - b.faixa);
  return (
    doAnexo.find(
      (f) => rbt12 >= f.limiteInferiorCentavos && rbt12 <= f.limiteSuperiorCentavos
    ) ?? doAnexo[doAnexo.length - 1]
  );
}

// --- Pró-labore -------------------------------------------------------------
// Precisa vir ANTES das provisões: é ele que define o Fator R, e o Fator R
// define se o DAS sai pelo Anexo III (6%–13,5%) ou pelo V (15,5%+).
// Com 6 sócios a R$ 2.900, a folha fica em ~30% da receita — acima dos 28%.
for (const { ano, mes } of MESES) {
  const dataComp = diaSeguro(ano, mes, 5);
  const valorCada = R$(2_900);
  const total = valorCada * SOCIOS.length;

  const txId = lancar({
    id: id("tx", competencia(ano, mes), "prolabore"),
    tipo: "DISTRIBUICAO",
    descricao: `Pró-labore ${competencia(ano, mes)}`,
    valorCentavos: total,
    dataCompetencia: carimbo(dataComp),
    dataCaixa: carimbo(dataComp),
    categoriaId: cat("Pró-labore"),
    criadoPorId: SOCIOS[0].id,
  });

  SOCIOS.forEach((s, i) => {
    distribuicoes.push({
      id: id("dist", competencia(ano, mes), "pl", i + 1),
      transacaoId: txId,
      socioId: s.id,
      natureza: "PRO_LABORE",
      valorCentavos: valorCada,
      competencia: competencia(ano, mes),
      criadoEm: carimbo(dataComp),
    });
  });
}

// --- Provisões de DAS -------------------------------------------------------
for (const t of transacoes.filter((x) => x.tipo === "ENTRADA")) {
  const d = new Date(t.dataCompetencia);
  const ano = d.getUTCFullYear();
  const mes = d.getUTCMonth() + 1;

  const rbt12 = receitasDaJanela(ano, mes);
  const folha = folhaDaJanela(ano, mes);
  const fatorBps = rbt12 > 0 ? Math.round((folha / rbt12) * 10_000) : null;
  const anexo = fatorBps === null || fatorBps >= 2800 ? "III" : "V";

  const f = faixaDe(anexo, rbt12);
  const aliquota =
    rbt12 <= 0 ? f.aliquotaNominalBps : aliquotaEfetivaBps(rbt12, f.aliquotaNominalBps, f.deducaoCentavos);

  impostos.push({
    id: t.id.replace("tx-", "imp-"),
    receitaId: t.id,
    tipo: "DAS",
    aliquotaBps: aliquota,
    valorCentavos: Math.round((t.valorCentavos * aliquota) / 10_000),
    anexo,
    rbt12Centavos: rbt12,
    // Preenchido no bloco de pagamento, logo abaixo.
    status: "PROVISIONADO",
    vencimento: carimbo(dataUTC(ano, mes + 1, 20)),
    pagamentoId: null,
    criadoEm: t.dataCompetencia,
  });
}

// --- Pagamento das guias ----------------------------------------------------
// Uma SAIDA por competência, com N receitas dentro — como é a guia de verdade.
// A competência do ÚLTIMO mês fica em aberto: o DAS dela vence no mês seguinte,
// que ainda não chegou.
for (const { ano, mes } of MESES) {
  const ehUltimo = ano === ULTIMO.ano && mes === ULTIMO.mes;
  if (ehUltimo) continue;

  const doMes = impostos.filter((g) => {
    const d = new Date(transacoes.find((t) => t.id === g.receitaId).dataCompetencia);
    return d.getUTCFullYear() === ano && d.getUTCMonth() + 1 === mes;
  });
  if (doMes.length === 0) continue;

  const soma = doMes.reduce((s, g) => s + g.valorCentavos, 0);
  const pagamento = dataUTC(ano, mes + 1, 20);

  const txId = lancar({
    id: id("tx", competencia(ano, mes), "das"),
    tipo: "SAIDA",
    descricao: `DAS — ${doMes.length} lançamento(s)`,
    valorCentavos: soma,
    dataCompetencia: carimbo(pagamento),
    dataCaixa: carimbo(pagamento),
    categoriaId: cat("Impostos"),
    observacoes: "Guia de imposto gerada a partir de provisões.",
    criadoPorId: SOCIOS[1].id,
  });

  for (const g of doMes) {
    g.status = "PAGO";
    g.pagamentoId = txId;
  }
}

// --- Despesas recorrentes ---------------------------------------------------
for (const { ano, mes } of MESES) {
  for (const r of RECORRENTES) {
    const data = diaSeguro(ano, mes, r.diaVencimento);
    lancar({
      id: id("tx", competencia(ano, mes), r.id),
      tipo: "SAIDA",
      descricao: r.descricao,
      valorCentavos: r.valorCentavos,
      dataCompetencia: carimbo(data),
      // O mês corrente ainda tem contas a pagar — sem isso o dashboard nunca
      // mostraria a coluna de pendências.
      dataCaixa:
        ano === ULTIMO.ano && mes === ULTIMO.mes && r.diaVencimento > 12
          ? null
          : carimbo(data),
      categoriaId: r.categoriaId,
      recorrenteId: r.id,
      competenciaRef: competencia(ano, mes),
      observacoes: "Gerado automaticamente a partir de um recorrente.",
      criadoPorId: autor(contadorAutor++),
    });
  }
}

// --- Despesas avulsas -------------------------------------------------------
for (const { ano, mes } of MESES) {
  const quantas = entre(1, 2);
  for (let n = 1; n <= quantas; n++) {
    const [descricao, valor, categoria] = escolher(DESPESAS_AVULSAS);
    const data = diaSeguro(ano, mes, entre(2, 27));
    lancar({
      id: id("tx", competencia(ano, mes), "desp", n),
      tipo: "SAIDA",
      descricao,
      valorCentavos: Math.round(valor * (0.85 + aleatorio() * 0.3)),
      dataCompetencia: carimbo(data),
      dataCaixa: carimbo(data),
      categoriaId: cat(categoria),
      socioId: aleatorio() > 0.7 ? escolher(SOCIOS).id : null,
      criadoPorId: autor(contadorAutor++),
    });
  }
}

// --- Distribuição de lucro --------------------------------------------------
// Trimestral, e só nos meses em que sobrou caixa. Distribuir todo mês seria
// irreal e deixaria o caixa livre sempre em zero.
for (const { ano, mes } of MESES) {
  if (![11, 2, 5, 8].includes(mes)) continue;

  const dataComp = diaSeguro(ano, mes, 28);
  const valorCada = R$(entre(35, 65) * 100);
  const total = valorCada * SOCIOS.length;

  const txId = lancar({
    id: id("tx", competencia(ano, mes), "lucro"),
    tipo: "DISTRIBUICAO",
    descricao: `Distribuição de lucro — ${competencia(ano, mes)}`,
    valorCentavos: total,
    dataCompetencia: carimbo(dataComp),
    dataCaixa: carimbo(dataComp),
    criadoPorId: SOCIOS[0].id,
  });

  SOCIOS.forEach((s, i) => {
    distribuicoes.push({
      id: id("dist", competencia(ano, mes), "lucro", i + 1),
      transacaoId: txId,
      socioId: s.id,
      natureza: "LUCRO",
      valorCentavos: valorCada,
      competencia: competencia(ano, mes),
      criadoEm: carimbo(dataComp),
    });
  });
}

// --- Caixinhas --------------------------------------------------------------
// Cada movimento tem uma TRANSFERENCIA espelho no ledger, 1 para 1. É a regra
// da ferramenta: o extrato precisa bater com o banco, mas transferência entre
// bolsos próprios não é receita nem despesa.
let seqMov = 0;
for (const { ano, mes } of MESES) {
  for (const cx of CAIXINHAS) {
    // Nem toda caixinha recebe todo mês — senão o gráfico vira escada perfeita.
    if (aleatorio() > 0.75) continue;

    const ehResgate = aleatorio() > 0.88;
    const valor = R$(entre(8, 30) * 100);
    const data = diaSeguro(ano, mes, entre(15, 28));
    seqMov++;

    const txId = lancar({
      id: id("tx", competencia(ano, mes), "cx", String(seqMov)),
      tipo: "TRANSFERENCIA",
      descricao: `${ehResgate ? "Resgate de" : "Depósito em"} ${cx.nome}`,
      valorCentavos: valor,
      dataCompetencia: carimbo(data),
      dataCaixa: carimbo(data),
      criadoPorId: autor(contadorAutor++),
    });

    movimentosCaixinha.push({
      id: id("mov", String(seqMov)),
      caixinhaId: cx.id,
      tipo: ehResgate ? "RESGATE" : "DEPOSITO",
      valorCentavos: valor,
      data: carimbo(data),
      descricao: null,
      transacaoId: txId,
      criadoEm: carimbo(data),
    });
  }
}

// --- Trilha de auditoria ----------------------------------------------------
// Uma amostra, não um evento por lançamento: a trilha real cresce com o uso, e
// 400 linhas idênticas não ensinam nada a quem está vendo a tela.
const AMOSTRA_AUDITORIA = [
  ["CRIAR", "TRANSACAO", "Lançou uma receita"],
  ["CRIAR", "TRANSACAO", "Lançou uma despesa"],
  ["PAGAR", "IMPOSTO", "Pagou guias de DAS"],
  ["CRIAR", "CAIXINHA", "Criou a caixinha Reserva de emergência"],
  ["DEPOSITAR", "CAIXINHA", "Depositou em Provisão de impostos"],
  ["ATUALIZAR", "CONFIG", "Ajustou o dia de vencimento do DAS"],
  ["CRIAR", "DISTRIBUICAO", "Registrou distribuição de lucro"],
  ["EXCLUIR", "TRANSACAO", "Removeu um lançamento duplicado"],
];
AMOSTRA_AUDITORIA.forEach(([acao, entidade, resumo], i) => {
  const s = SOCIOS[i % SOCIOS.length];
  auditoria.push({
    id: id("aud", String(i + 1)),
    quando: carimbo(dataUTC(2026, 8, 3 + i * 2)),
    socioId: s.id,
    email: s.email,
    acao,
    entidade,
    entidadeId: null,
    resumo,
    valorCentavos: i % 3 === 0 ? R$(entre(500, 9_000)) : null,
  });
});

// --- Montagem ---------------------------------------------------------------
transacoes.sort((a, b) => a.dataCompetencia.localeCompare(b.dataCompetencia));

const dados = {
  config: CONFIG,
  faixasSimples: FAIXAS,
  socios: SOCIOS,
  clientes: CLIENTES,
  categorias: CATEGORIAS,
  caixinhas: CAIXINHAS,
  recorrentes: RECORRENTES,
  importacoes: [],
  transacoes,
  impostos,
  distribuicoes,
  movimentosCaixinha,
  auditoria,
};

const resumo = Object.fromEntries(Object.entries(dados).map(([k, v]) => [k, v.length]));

const saida = {
  financeops: {
    versao: 1,
    geradoEm: new Date().toISOString(),
    observacao:
      "DADOS FICTICIOS para demonstracao. Socios, clientes e valores sao inventados; " +
      "os e-mails usam o dominio reservado .invalid e nunca recebem link de acesso. " +
      "Restaurar em modo 'substituir tudo' APAGA os socios reais e os e-mails de " +
      "acesso desta instalacao. Use somente numa instancia de demonstracao.",
  },
  resumo,
  dados,
};

const destino = join(process.cwd(), "backups");
if (!existsSync(destino)) mkdirSync(destino, { recursive: true });
const caminho = join(destino, "financeops-demo.json");
writeFileSync(caminho, JSON.stringify(saida, null, 2), "utf8");

// --- Conferência ------------------------------------------------------------
const soma = (lista) => lista.reduce((s, t) => s + t.valorCentavos, 0);
const entradas = transacoes.filter((t) => t.tipo === "ENTRADA");
const recebidas = entradas.filter((t) => t.dataCaixa);
const saidasPagas = transacoes.filter((t) => t.tipo === "SAIDA" && t.dataCaixa);
const distPagas = transacoes.filter((t) => t.tipo === "DISTRIBUICAO" && t.dataCaixa);
const transf = transacoes.filter((t) => t.tipo === "TRANSFERENCIA");

const guardado = movimentosCaixinha.reduce(
  (s, m) => s + (m.tipo === "DEPOSITO" ? m.valorCentavos : -m.valorCentavos),
  0
);
const saldoBruto = soma(recebidas) - soma(saidasPagas) - soma(distPagas);

console.log(`\nArquivo: ${caminho}`);
console.log(`Registros: ${Object.values(resumo).reduce((a, b) => a + b, 0)}`);
console.log(Object.entries(resumo).map(([k, v]) => `  ${k}: ${v}`).join("\n"));
console.log(`\nPeríodo: ${competencia(MESES[0].ano, MESES[0].mes)} a ${competencia(ULTIMO.ano, ULTIMO.mes)}`);
console.log(`Faturado (competência):     ${brl(soma(entradas))}`);
console.log(`Recebido (caixa):           ${brl(soma(recebidas))}`);
console.log(`A receber:                  ${brl(soma(entradas) - soma(recebidas))}`);
console.log(`Despesas pagas:             ${brl(soma(saidasPagas))}`);
console.log(`Distribuído aos sócios:     ${brl(soma(distPagas))}`);
console.log(`Saldo bruto:                ${brl(saldoBruto)}`);
console.log(`Guardado em caixinhas:      ${brl(guardado)}`);
console.log(`Saldo em conta:             ${brl(saldoBruto - guardado)}`);
console.log(`\nGuias pagas:   ${impostos.filter((i) => i.status === "PAGO").length}`);
console.log(`Provisionadas: ${impostos.filter((i) => i.status === "PROVISIONADO").length}`);
console.log(`Transferências (espelho de caixinha): ${transf.length} para ${movimentosCaixinha.length} movimentos`);
