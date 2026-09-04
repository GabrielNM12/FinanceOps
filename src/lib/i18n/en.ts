/**
 * English dictionary. Structurally must equal `pt` — it is typed `typeof pt`,
 * so a missing/extra key or a changed function signature is a compile error.
 *
 * Brazilian tax vocabulary is kept verbatim on purpose: "Simples Nacional",
 * "DAS", "Fator R", "RBT12", "pró-labore", "Anexo III/V" name a specific
 * Brazilian regime and have no real English equivalent. "Competência"/"Caixa"
 * are kept as the regime names, with English helper text around them.
 *
 * The audit screen is intentionally bilingual: the stored `resumo` text is
 * historical data and is not translated, only the surrounding chrome.
 */
import type { pt } from "./pt";

export const en: typeof pt = {
  common: {
    save: "Save",
    saving: "Saving...",
    saveShort: "save",
    cancel: "Cancel",
    cancelLower: "cancel",
    confirm: "Confirm",
    delete: "delete",
    remove: "remove",
    add: "Add",
    clear: "clear",
    close: "close",
    edit: "Edit",
    manage: "manage",
    dash: "—",
    optional: "(optional)",
    all_f: "All",
    everything: "Everything",
    retry: "Try again",
    loadError: "Couldn't load this screen",
    loading: "Loading data…",
    noResponse: "No response from the server. Is it still running?",
    httpFail: (status: number) => `Failed to load (HTTP ${status})`,
    date: "Date",
    description: "Description",
    value: "Amount",
    category: "Category",
    client: "Client",
    partner: "Partner",
    type: "Type",
  },

  meta: {
    title: "FinanceOps — Korvantis",
    description: "Cash, taxes and partner distributions in one place",
  },

  nav: {
    dashboard: "Dashboard",
    dashboardHint: "Consolidated position",
    transactions: "Transactions",
    transactionsHint: "Revenue, expenses and distributions",
    taxes: "Taxes",
    taxesHint: "Provisions and paid bills",
    reserves: "Reserves",
    reservesHint: "Money set aside by goal",
    recurring: "Recurring",
    recurringHint: "Fixed monthly costs",
    import: "Import",
    importHint: "CSV of money in and out",
    audit: "Audit",
    auditHint: "Who did what in the system",
    settings: "Settings",
    settingsHint: "Partners, clients, categories and tax",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    account: "Access",
    demoNote: "No login. Transactions are attributed to this partner.",
    signingOut: "Signing out...",
    signOut: "Sign out",
    disclaimer:
      "Tax figures are estimates. Confirm with your accountant before any decision.",
  },

  dates: {
    monthsShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  },

  money: {
    invalid: "Invalid amount",
    invalidMoney: (raw: string) => `Invalid monetary amount: "${raw}"`,
    invalidPercent: (raw: string) => `Invalid percentage: "${raw}"`,
  },

  skeleton: {
    loadError: "Couldn't load this screen",
  },

  charts: {
    noData: "No data for the period.",
    billed: "Billed",
    expenses: "Expenses",
    taxes: "Taxes",
    profit: "Profit",
    revenue: "Revenue",
    profits: "Profits",
    proLabore: "Pró-labore",
    projectedBalance: "Projected balance",
  },

  dashboard: {
    title: "Dashboard",
    subtitle: (mes: string) => `Consolidated position — ${mes}`,
    subtitleLoading: "Loading consolidated position…",
    regimeLabel: "Basis:",
    regimeCompetencia: "Competência",
    regimeCompetenciaHint: "Uses the month the service was billed",
    regimeCaixa: "Caixa",
    regimeCaixaHint: "Uses the month the money came in or went out",

    caixaLivreNegTitle: "Free cash is negative.",
    caixaLivreNeg: (conta: string, imposto: string) =>
      `The account balance (${conta}) does not cover ${imposto} of tax on revenue already received. Do not distribute profit until this is resolved — draw from a reserve if you need to.`,
    impostoAReceberStrong: (v: string) => `${v} of tax`,
    impostoAReceber: (aReceber: string) =>
      `is provisioned on revenue that has not come in yet (${aReceber} receivable). That amount does `,
    impostoAReceberNao: "not",
    impostoAReceberFim:
      "reduce the free cash above — but the DAS is due on billing, not on receipt. If the client is late, the bill comes due anyway.",
    guiasVencendoStrong: (n: number) => `${n} tax bill(s)`,
    guiasVencendo: (total: string) =>
      `due within the next 15 days, totaling ${total}. `,
    verImpostos: "See taxes",

    kpiEmConta: "In account",
    kpiEmContaDetalhe: (patrimonio: string) => `Total assets ${patrimonio}`,
    kpiCaixaLivre: "Free cash",
    kpiCaixaLivreDetalhe: (imposto: string) => `Account − ${imposto} of tax on money received`,
    kpiGuardado: "Set aside",
    kpiGuardadoDetalhe: (n: number) => `${n} reserve(s)`,
    kpiAReceber: "Receivable",
    kpiAReceberComImposto: (v: string) => `Carries ${v} of tax`,
    kpiAReceberSemImposto: "Billed and not yet received",
    kpiAPagar: "Payable",
    kpiAPagarDetalhe: (v: string) => `Includes ${v} of tax outstanding`,
    kpiFaturadoMes: "Billed this month",
    kpiImpostos: "Taxes",
    kpiDespesas: "Expenses",
    kpiLucro: "Profit",
    kpiDistribuido: "Distributed",
    kpiDistribuidoDetalhe: (v: string) => `Retained: ${v}`,

    fluxoTitulo: (meses: number, regime: string) =>
      `Cash flow — last ${meses} months (${regime})`,
    fluxoRegimeCaixa: "cash basis",
    fluxoRegimeCompetencia: "accrual basis",
    mesesSufixo: (n: number) => `${n}m`,

    despesasPorCategoria: "Expenses by category",
    receitaPorCliente: "Revenue by client",
    distribuidoPorSocio: "Distributed per partner (cumulative)",
    projecaoTitulo: "Cash projection — 6 months",
    projecaoNota:
      "Accounts for active recurring rules, commitments already booked and tax bills due in the period. Nothing is written to the database.",
    caixinhasTitulo: "Reserves",
    caixinhasVaziasPre: "No reserves yet.",
    caixinhasVaziasLink: "Create one",
    caixinhasVaziasPos: "to set money aside by goal.",
    caixinhasNota:
      "Setting money aside moves it from the account into a reserve — total assets don't change, but free cash does. Each move shows on the statement as a transfer.",

    thSocio: "Partner",
    thLucros: "Profits",
    thProLabore: "Pró-labore",
    thTotal: "Total",

    fatorRTitulo: "Fator R",
    fatorRExplica:
      "Payroll (pró-labore) divided by revenue over the last 12 months. At 28% or more the company falls under Anexo III, which starts at 6.00% — below that, Anexo V, which starts at 15.50%.",
    fatorRAnexo: (anexo: string) => `Anexo ${anexo}`,
    fatorRRbt12: "RBT12",
    fatorRFolha: "Payroll 12 months",
    fatorRMargem: "Margin over the threshold",
    fatorRFalta: "Gap to Anexo III",
    fatorRLimite28: "28% threshold",
    fatorRZona:
      "You are in the attention zone (between 26% and 30%). A small change in revenue or pró-labore shifts the anexo and the rate. Worth talking to the accountant before closing the next distribution.",
  },

  transactions: {
    title: "Transactions",
    subtitle: "Every cash movement in the company, in accrual order.",
    exportCsv: "Export CSV",

    tipoReceita: "Revenue",
    tipoDespesa: "Expense",
    tipoDistribuicao: "Distribution",
    tipoAporte: "Capital",
    tipoTransferencia: "Transfer",

    filtroBuscar: "Search",
    filtroBuscarPlaceholder: "description...",
    filtroTipo: "Type",
    filtroCliente: "Client",
    filtroSituacao: "Status",
    optTodos: "All",
    optReceitas: "Revenue",
    optDespesas: "Expenses",
    optDistribuicoes: "Distributions",
    optAportes: "Capital",
    optTransferencias: "Transfers",
    optTodasSituacoes: "All",
    optPendentes: "Pending",
    optLiquidadas: "Settled",
    filtrar: "Filter",

    vazioComFiltro: "No transactions match these filters.",
    vazioPre: "No transactions yet. Use",
    vazioNovo: "New transaction",
    vazioMeio: "above or import a statement in",
    vazioLink: "Import",

    thCompetencia: "Competência",
    thDescricao: "Description",
    thTipo: "Type",
    thClienteCategoria: "Client / Category",
    thValor: "Amount",
    thImposto: "Tax",
    thCaixa: "Cash",

    pagoPor: "paid by ",
    recorrente: "recurring",
    lancadoPor: (nome: string) => `booked by ${nome}`,
    pendente: "pending",
    liquidado: (data: string) => `settled ${data}`,
    impostoLabel: "tax",
    marcarPendente: "Mark as pending",
    desfazer: "undo",
    confirmar: "confirm",

    truncado: (limite: number, total: number) =>
      `Showing ${limite} of ${total} transactions. Use the filters to narrow down.`,
  },

  forms: {
    novoLancamento: "New transaction",
    fecharFormulario: "Close form",
    abaReceita: "Revenue",
    abaDespesa: "Expense",
    abaDistribuicao: "Distribution / Pró-labore",
    abaAporte: "Capital",
    salvando: "Saving...",
    registrarReceita: "Record revenue",
    registrarDespesa: "Record expense",
    registrar: "Record",
    registrarAporte: "Record capital",

    descricao: "Description",
    valorBruto: "Gross amount",
    valor: "Amount",
    cliente: "Client",
    categoria: "Category",
    dataFaturamento: "Billing date",
    dataRecebimento: "Receipt date",
    observacoes: "Notes",
    clienteOpcional: "Client (optional)",
    pagoPor: "Paid by",
    dataDespesa: "Expense date",
    dataPagamento: "Payment date",
    socio: "Partner",
    natureza: "Nature",
    competencia: "Competência",
    descricaoOpcional: "Description (optional)",
    data: "Date",

    phReceita: "Invoice 042 — August sprint",
    phValorReceita: "15,000.00",
    phDespesa: "AWS — August",
    phValorDespesa: "1,240.90",
    phValorDistribuicao: "5,000.00",
    phAporte: "Capital contribution",
    phImpostoValor: "0.00",

    semCliente: "— no client —",
    despesaGeral: "— general expense —",
    empresa: "Company",
    doProprioBolso: (nome: string) => `${nome} (out of pocket)`,
    selecione: "Select...",
    natLucro: "Profit distribution",
    natProLabore: "Pró-labore",
    natReembolso: "Reimbursement",

    aReceberHint: 'Leave empty if not received yet — it comes in as "receivable".',
    naoPagoHint: "Empty = not paid yet.",
    margemHint: "Linking to a client enables the margin calculation.",
    bolsoHint: "Mark the partner when they fronted the money themselves.",
    aporteHint:
      "Capital comes into cash but is not revenue — it generates no tax and does not count as billing.",

    impostoBloco: "Tax (Simples Nacional)",
    semIncidencia: "Revenue not subject to tax",
    numBruto: "Gross",
    numAliquota: (anexo: string, faixa: number) => `Rate (Anexo ${anexo}, bracket ${faixa})`,
    numImposto: "Tax",
    numLiquido: "Net",
    impostoNota: (rbt12: string) =>
      `Calculated on an RBT12 of ${rbt12}. The bill is due on the 20th of the following month and stays provisioned until you record the payment.`,
    ajustarManual: "Adjust manually",
    usarAutomatico: "Use the automatic calculation",
    aliquotaPct: "Rate (%)",
    ouValorImposto: "Or tax amount",
    valorPrevalece: "If you fill in the amount, it overrides the rate.",
    informeValor: "Enter the amount to see the rate and the net.",

    natExplicaLucro:
      "Not a company expense and does not count toward Fator R. It is the allocation of profit already earned.",
    natExplicaProLabore:
      "It is a company expense and DOES count toward Fator R — it is what can move you to Anexo III. It has its own charges (INSS/IRRF) that are not calculated here.",
    natExplicaReembolso:
      "Repaying money the partner fronted. Not a new expense — the original expense was already booked when they paid.",
  },

  taxes: {
    title: "Taxes",
    subtitle: "Provisions generated by revenue, and bills actually paid.",

    kpiSobreRecebida: "On revenue received",
    kpiSobreRecebidaDetalhe: "This is what reduces free cash",
    kpiSobreAReceber: "On receivables",
    kpiSobreAReceberDetalhe: (n: number) => `${n} bill(s) not backed by cash`,
    kpiVencido: "Overdue",
    kpiVencidoDetalhe: (n: number) => `${n} bill(s) past due`,
    kpiDasEstimado: (mes: string) => `Estimated DAS — ${mes}`,
    kpiDasEstimadoDetalhe: (v: string) => `On ${v} billed`,
    aliquotaVigente: "Current rate",
    aliquotaVigenteDetalhe: (anexo: string, faixa: number, nominal: string) =>
      `Anexo ${anexo}, bracket ${faixa} — nominal ${nominal}`,

    riscoStrong: (n: number, total: string) => `${n} bill(s) totaling ${total}`,
    risco:
      "come due within the next 15 days and are on revenue not yet received. The DAS is due on billing, not on receipt — if the client does not pay first, that money leaves cash anyway. Chase the client or make sure the balance is there.",

    formulaPre: "The effective rate is",
    formula: (nominal: string, deducao: string) => `(RBT12 × ${nominal} − ${deducao}) ÷ RBT12`,
    formulaPos: (rbt12: string, fatorR: string) =>
      `, with an RBT12 of ${rbt12}. The anexo comes from the current Fator R (${fatorR}). Check the brackets in Settings before closing the month.`,
  },

  taxPanel: {
    provisoesAbertas: (n: number) => `Open provisions (${n})`,
    selecionarVencidas: "Select overdue",
    selecionarComLastro: "Select cash-backed",
    recalcular: "Recalculate provisions",
    recalcularResultado: (alterados: number, total: number) =>
      `${alterados} of ${total} provisions updated to the current rate.`,
    vazioAbertas:
      "No open bills. Every booked revenue provisions the DAS automatically.",

    thReceita: "Revenue",
    thLastro: "Backing",
    thCompetencia: "Competência",
    thVencimento: "Due",
    thAliquota: "Rate",
    thValor: "Amount",
    badgeRecebida: "received",
    badgeAReceber: "receivable",
    badgeAReceberTitle:
      "The revenue has not come into the account yet. This provision does not reduce free cash — but the bill comes due anyway.",
    manual: "manual",
    anexoAbrev: (anexo: string) => `(An. ${anexo})`,
    venceMobile: (data: string) => `· due ${data}`,

    semLastroAviso: (n: number) => `${n} selected bill(s) are on revenue that `,
    semLastroAvisoBold: "has not been received yet",
    semLastroAvisoFim:
      ". Paying them is legitimate — the DAS is due on billing — but the money leaves a free-cash figure that did not count on them. Check the balance before confirming.",

    selecionadas: (n: number) => `${n} bill(s) selected`,
    dataPagamento: "Payment date",
    registrando: "Recording...",
    registrarPagamento: "Record payment",
    pagamentoRegistrado: (valor: string, data: string) =>
      `Bill of ${valor} recorded as paid on ${data}.`,
    pagamentoNota:
      "The payment creates a single cash outflow for the whole set — that is how the DAS shows on the bank statement.",

    guiasPagas: "Paid bills",
    vazioPagas: "No paid bills yet.",
    thPagamento: "Payment",
    thData: "Date",
    thReceitas: "Revenues",
    estornar: "reverse",
    estornado: "Payment reversed. The provisions are open again.",
  },

  reserves: {
    title: "Reserves",
    subtitle: "Set money aside by goal. Setting aside moves it from the account into the reserve.",
    nova: "New reserve",

    kpiEmConta: "In account",
    kpiEmContaDetalhe: "Available to move",
    kpiGuardado: "Set aside",
    kpiGuardadoDetalhe: (n: number) => `${n} active reserve(s)`,
    kpiPatrimonio: "Assets",
    kpiPatrimonioDetalhe: "Account + reserves",
    kpiCaixaLivre: "Free cash",
    kpiCaixaLivreDetalhe: "Account minus tax on money received",

    vazio:
      "No reserves yet. Create one to set money aside by goal — emergency fund, year-end bonus, equipment, tax provision.",
    atualizada: "Reserve updated.",
    criada: "Reserve created.",
    novoSaldo: (nome: string, saldo: string) => `${nome} now holds ${saldo}.`,

    arquivadas: "Archived",
    reativar: "reactivate",

    notaRodape:
      "Setting aside is a transfer between your own pockets: money leaves the account and enters the reserve, and each move shows on the statement as a Transfer. Not revenue or expense — the month's profit does not change when you set money aside. What changes is free cash, because the money is no longer available.",
    notaRodapeTransferencia: "Transfer",

    editarTitle: "Edit",
    metaLabel: (v: string) => `Goal ${v}`,
    metaAte: (data: string) => ` by ${data}`,
    metaAtingida: "Goal reached",
    metaFaltam: (v: string) => `${v} to go`,

    guardar: "Set aside",
    resgatar: "Withdraw",
    historico: (n: number) => `history (${n})`,
    phValorMov: "1,000.00",
    phDescMov: "Description (optional)",
    dispEmConta: (v: string) => `Available in account: ${v}`,
    nestaCaixinha: (v: string) => `In this reserve: ${v}`,
    confirmarCurto: "...",
    nenhumMovimento: "No movements yet.",
    movDeposito: "Deposit",
    movResgate: "Withdrawal",
    excluirMovTitle: "Delete movement and the transfer on the statement",
    arquivarCaixinha: "archive reserve",

    formEditar: (nome: string) => `Edit ${nome}`,
    formNova: "New reserve",
    fNome: "Name",
    fMeta: "Goal (optional)",
    fMetaData: "By when (optional)",
    fObservacoes: "Notes",
    fCor: "Color",
    fIcone: "Icon",
    phNome: "Emergency fund",
    phMeta: "30,000.00",
    corAria: (cor: string) => `Color ${cor}`,
    criarCaixinha: "Create reserve",
  },

  recurring: {
    title: "Recurring",
    subtitle: "Rules that generate transactions automatically every month.",
    gerarAgora: "Generate due entries now",
    nadaPendente: "Nothing pending — every due month has already been generated.",
    gerados: (n: number) => `${n} transaction(s) generated.`,
    criado: "Recurring rule created. The months already due were generated.",

    kpiSaidas: "Fixed outflow / month",
    kpiEntradas: "Fixed inflow / month",
    kpiResultado: "Fixed result / month",

    novo: "New recurring rule",
    fDescricao: "Description",
    fTipo: "Type",
    fValor: "Amount",
    fCategoria: "Category",
    fDiaVencimento: "Due day",
    fInicio: "Start",
    fFim: "End (optional)",
    phDescricao: "Google Workspace",
    phValor: "245.00",
    optSaida: "Outflow",
    optEntrada: "Inflow",
    criarRecorrente: "Create recurring rule",
    novoNota:
      "On save, the months already due since the start date are generated right away, as transactions pending payment.",

    vazio: "No recurring rules yet.",
    thDescricao: "Description",
    thCategoria: "Category",
    thVencimento: "Due",
    thPeriodo: "Period",
    thValor: "Amount",
    thGerados: "Generated",
    tagEntrada: "inflow",
    tagSaida: "outflow",
    dia: (n: number) => `day ${n}`,
    semFim: "no end",
    geradosLabel: (n: number) => `${n} generated`,
    pausar: "pause",
    reativar: "reactivate",
    notaRodape:
      "Transactions are materialized as real records, not computed on the fly. That lets you edit a given month's amount (the power bill is never the same) and keeps the history matching the bank statement. Deleting the rule does not delete the transactions already generated.",
  },

  importPage: {
    title: "Import and export",
    subtitle:
      "Bank statement as CSV, or a full backup to restore the whole system.",
    backupCompleto: "Full backup",
    lancamentos: "Transactions",
    impostos: "Taxes",
    tabCsv: "CSV statement",
    tabBackup: "Full backup",
    importacoesAnteriores: "Previous imports",
    thArquivo: "File",
    thData: "Date",
    thLinhas: "Rows",
    thImportadas: "Imported",
    thIgnoradas: "Skipped",
  },

  importer: {
    passo1: "1. Choose the file",
    arquivoCsv: "CSV file",
    analisando: "Analyzing...",
    analisar: "Analyze",
    formatoTitulo: "Expected format",
    formatoP1Pre: "Recognized columns (in any order, flexible names): ",
    formatoP1Pos: ". Only ",
    formatoP1Fim: " are required.",
    formatoP2Pre: " accepts ",
    formatoP2Meio: ". For a distribution, ",
    formatoP2MeioB: " picks between ",
    formatoP2Fim:
      " — and the socio column becomes required, with the name exactly as registered.",
    formatoP3:
      "Accepts ; or , as separator, values like 1,234.56 and dd/mm/yyyy dates. Without a tipo column, a negative value becomes an expense. Leave data_caixa empty for the transaction to come in as pending. ",
    baixarModelo: "Download template",

    passo2: (arquivo: string) => `2. Review before saving — ${arquivo}`,
    contLinhas: "Rows",
    contValidas: "Valid",
    contJaImportadas: "Already imported",
    contComErro: "With errors",
    duplicadasAviso: (n: number) =>
      `${n} row(s) already exist in the database (same date, amount and description) and will be skipped. That is what lets you re-import a whole month's statement without duplicating anything.`,

    thHash: "#",
    thData: "Date",
    thDescricao: "Description",
    thTipo: "Type",
    thCategoria: "Category",
    thClienteSocio: "Client / Partner",
    thValor: "Amount",
    thSituacao: "Status",

    tipoReceita: "revenue",
    tipoDespesa: "expense",
    tipoAporte: "capital",
    tipoProLabore: "pró-labore",
    tipoReembolso: "reimbursement",
    tipoLucro: "profit",
    jaImportada: "already imported",
    ok: "ok",

    provisionarLabel: "Provision DAS on the imported revenue",
    provisionarSub:
      "Only uncheck if the tax on this revenue is already booked — otherwise the month comes in without tax and profit is inflated.",
    importando: "Importing...",
    importarN: (n: number) => `Import ${n} transaction(s)`,
    resultado: (importadas: number, ignoradas: number) =>
      `${importadas} transaction(s) imported, ${ignoradas} skipped.`,
  },

  restore: {
    passo1: "1. Choose the backup",
    baixarAgora: "Download a backup now",
    arquivoJson: ".json file",
    lendo: "Reading...",
    analisar: "Analyze",
    explica:
      "The full backup carries everything: partners, clients, categories, reserves, recurring rules, transactions and the tax provisions with the rate that applied at the time. The transactions CSV next to it does not — it would recompute the DAS with today's rules.",

    passo2: "2. Review before saving",
    meta: (arquivo: string, data: string, versao: number) =>
      `${arquivo} · generated on ${data} · version ${versao}`,
    inconsistente: "Inconsistent backup.",

    thTabela: "Table",
    thNoBanco: "In the database now",
    thNoBackup: "In the backup",

    modoSubstituirTitulo: "Replace everything",
    modoSubstituirDesc:
      "— a real restore. Wipes the current content and rebuilds the database from the file. The result is identical to the original, IDs included.",
    modoMesclarTitulo: "Merge",
    modoMesclarDesc:
      "— only what's missing. Inserts records that don't exist yet. Nothing is overwritten: a transaction edited after the backup stays as it is.",

    confirmacao: (n: number) =>
      `I understand that the ${n} records currently in the database will be deleted and replaced by the contents of this file. There is no undo.`,

    restaurando: "Restoring...",
    substituirTudo: "Replace everything",
    mesclar: "Merge",
    resultadoSubstituir: (total: number) => `Database restored: ${total} records written.`,
    resultadoMesclar: (total: number, pulado: number) =>
      `${total} record(s) inserted, ${pulado} already existed and were kept.`,
  },

  audit: {
    title: "Audit",
    subtitle: "Who did what, and when. Read-only log.",
    filtroPessoa: "Person",
    filtroOnde: "Where",
    filtroAcao: "Action",
    vazioComFiltro: "No events match these filters.",
    vazio: "Nothing logged yet. The trail starts on the next transaction.",
    truncado: (limite: number, total: number) =>
      `Showing ${limite} of ${total} events. Use the filters to narrow down.`,
    appendOnlyPre: "The trail is",
    appendOnlyBold: "append-only",
    appendOnly:
      ': nothing here is edited or deleted by the application. A record the system itself can change is no use for auditing the system. Restoring a backup in "replace everything" mode wipes the previous trail — but the restore event itself is logged right after.',
  },

  auditLabels: {
    verbos: {
      CRIAR: "created",
      ATUALIZAR: "changed",
      EXCLUIR: "deleted",
      CONFIRMAR: "confirmed",
      DESFAZER: "undid",
      PAGAR: "paid",
      ESTORNAR: "reversed",
      GUARDAR: "set aside",
      RESGATAR: "withdrew",
      IMPORTAR: "imported",
      RESTAURAR: "restored",
      ACESSO: "accessed",
    },
    entidades: {
      LANCAMENTO: "transaction",
      IMPOSTO: "tax",
      CAIXINHA: "reserve",
      SOCIO: "partner",
      CLIENTE: "client",
      CATEGORIA: "category",
      RECORRENTE: "recurring rule",
      BACKUP: "backup",
      CONFIG: "setting",
    },
  },

  settings: {
    title: "Settings",
    subtitle: "Partners, clients, categories and tax parameters.",

    secSocios: "Partners",
    secClientes: "Clients",
    secCategorias: "Categories",
    secRegime: "Tax basis",
    secFaixas: "Simples Nacional brackets",
    secBackup: "Backup",

    participacaoAviso: (soma: string) =>
      `The shares add up to ${soma} instead of 100%. With 6 equal partners the right split is 16.67% for four of them and 16.66% for two — 16.67% for everyone would be 100.02%.`,

    fNome: "Name",
    fEmail: "Email",
    fParticipacao: "Share (%)",
    phParticipacao: "16.67",
    fNomeCliente: "Client name",
    phCliente: "ACME Ltd",
    fNatureza: "Nature",
    fCor: "Color",
    optDespesa: "Expense",
    optReceita: "Revenue",

    thSocio: "Partner",
    thEmail: "Email",
    thParticipacao: "Share",
    thJaRecebeu: "Received so far",
    thTotal: "Total",
    thCliente: "Client",
    thReceita: "Revenue",
    thImpostos: "Taxes",
    thDespesas: "Expenses",
    thMargem: "Margin",
    thPct: "%",
    thAnexo: "Anexo",
    thFaixa: "Bracket",
    thRbt12: "RBT12",
    thAliquotaDeducao: "Nominal rate and deduction",

    inativar: "deactivate",
    reativar: "reactivate",
    inativo: "inactive",
    tagReceita: "revenue",
    tagDespesa: "expense",
    tagImposto: "tax",

    emailAlterado: (nome: string, email: string) =>
      `${nome}'s access is now ${email}. The previous address lost access immediately.`,
    emailRemovido: (nome: string) => `${nome} now has no email and can no longer sign in.`,

    sociosNota1:
      "A partner with a recorded distribution is not deleted, only deactivated — deleting would take away the record of who received what.",
    sociosNota2:
      "Email is the login identity: only addresses listed here, on active partners, receive an access link. When you change an address, the old one loses access immediately — open sessions drop and links already sent stop working.",

    clientesVazio:
      "No clients yet. They show up in the picker when you record revenue, and are also created automatically when you import a CSV with a cliente column.",
    clientesNota:
      "Margin = revenue − tax provisioned on it − expenses linked to the client. General expenses (accounting, office) do not count: they don't belong to a specific client and splitting them would distort the comparison. A client with transactions is deactivated rather than deleted.",

    categoriasNota:
      "The nature decides which form the category shows in. The category marked as tax is where the DAS bills are booked — it cannot be deleted, and there can be only one.",

    anexoDoSimples: "Simples anexo",
    optAuto: "Automatic (by Fator R)",
    optForcarIII: "Force Anexo III",
    optForcarV: "Force Anexo V",
    anexoAtualizado: "Anexo updated.",
    anexoNota:
      "Leave it automatic unless your accountant says otherwise. On automatic, the anexo is recomputed on every transaction from the pró-labore ÷ revenue ratio over the last 12 months.",
    diaVencimentoDas: "DAS due day",
    diaAtualizado: "Due day updated.",
    diaNota: "Used to compute when provisions come due. Not adjusted to business days.",

    faixasAviso:
      "These values came from a seed and should be checked with your accountant. Changing a bracket only affects future calculations and the open provisions you recalculate — bills already paid are never rewritten.",
    faixaAtualizada: (faixa: number, anexo: string) =>
      `Bracket ${faixa} of Anexo ${anexo} updated.`,
    faixaOrdinal: (n: number) => `#${n}`,
    faixaAte: "to",

    backupTextoPre: "The whole database is a single file: ",
    backupTextoMeio:
      ". A backup is copying that file with the app stopped. For a weekly backup with the app running, use ",
    backupTextoFim: ", which uses SQLite's safe command.",
    backupGitignore:
      "on purpose — it holds real financial data and must not go into any repository.",

    semEmail: "no email — can't sign in",
    alterarEmail: "Change access email",
    phEmail: "you@korvantis.com",
  },

  login: {
    confiraEmail: "Check your email",
    enviadoPara: (email: string) =>
      `If ${email} is registered, the access link arrives in a moment. It is valid for 15 minutes and works once.`,
    usarOutro: "use another email",
    entrar: "Sign in",
    semSenha: "We sent an access link to your email. There is no password.",
    erroSessao: "Your session expired. Request a new link to continue.",
    erroLink: "This link expired or was already used. Request a new one.",
    erroSemAcesso: "This access is no longer active.",
    erroGenerico: "Could not sign in. Try again.",
    email: "Email",
    phEmail: "you@korvantis.com",
    enviando: "Sending...",
    enviarLink: "Send access link",
    falhaEnviar: "Failed to send. Try again in a moment.",
    rodape: "Only emails registered as an active partner have access.",
  },

  demo: {
    aviso:
      "DEMO MODE — no authentication. Fictional data, anyone with the URL has full access.",
  },

  icons: {
    "piggy-bank": "Piggy bank",
    "shield-check": "Emergency",
    landmark: "Taxes",
    laptop: "Equipment",
    plane: "Travel",
    wrench: "Maintenance",
    "graduation-cap": "Training",
    gift: "Year-end bonus",
    "trending-up": "Investment",
    building: "Office",
  },

  queries: {
    semCategoria: "No category",
    semCliente: "No client",
  },

  generated: {
    proLabore: "Pró-labore",
    reembolso: "Reimbursement",
    distribuicaoLucros: "Profit distribution",
    comSocio: (base: string, socio: string) => `${base} — ${socio}`,
    aporteCapital: "Capital contribution",
    guardadoEm: (nome: string) => `Set aside in ${nome}`,
    resgatadoDe: (nome: string) => `Withdrawn from ${nome}`,
    transfContaParaCaixinha: "Transfer from account to reserve",
    transfCaixinhaParaConta: "Transfer from reserve to account",
    categoriaImpostos: "Taxes (DAS)",
    dasLancamentos: (n: number) => `DAS — ${n} transaction(s)`,
    guiaGerada: "Tax bill generated from provisions.",
    recorrenteAuto: "Generated automatically from a recurring rule.",
  },

  backup: {
    rotulos: {
      config: "Settings",
      faixasSimples: "Simples brackets",
      socios: "Partners",
      clientes: "Clients",
      categorias: "Categories",
      caixinhas: "Reserves",
      recorrentes: "Recurring rules",
      importacoes: "Import history",
      transacoes: "Transactions",
      impostos: "Provisions and bills",
      distribuicoes: "Distributions",
      movimentosCaixinha: "Reserve movements",
      auditoria: "Audit trail",
    },
    naoJsonValido: "File is not valid JSON.",
    naoEhBackup:
      "This does not look like a FinanceOps backup. The `financeops.versao` header is missing.",
    versaoAlta: (arquivo: number, suportada: number) =>
      `Backup is version ${arquivo}, but this install reads at most ${suportada}. Update the app before restoring.`,
    semDados: "The file has no `dados` section.",
    secaoNaoLista: (rotulo: string) => `The "${rotulo}" section should be a list.`,
    registrosSemId: (n: number, rotulo: string) =>
      `${n} record(s) in "${rotulo}" have no id. Corrupt file.`,
    secaoAusente: (rotulo: string) => `"${rotulo}" is not in the file — it will be ignored.`,
    orfaos: (n: number, rotulo: string, campo: string) =>
      `${n} record(s) point to ${rotulo} that is not in the file (field ${campo}).`,
    refUmLancamento: "a transaction",
    refUmSocio: "a partner",
    refUmaCaixinha: "a reserve",
    repetidos: (rotulo: string, n: number, campo: string, amostra: string, mais: boolean) =>
      `${rotulo}: ${n} repeated ${campo}(s) — ${amostra}${mais ? ", ..." : ""}.`,
    dividemCampo: (rotulo: string, n: number, campo: string, amostra: string, mais: boolean) =>
      `${rotulo}: ${n} record(s) share the same ${campo} — ${amostra}${mais ? ", ..." : ""}.`,
    observacaoArquivo:
      "Full FinanceOps backup. Restore it in Import -> Full backup.",
  },

  csv: {
    dataInvalida: (raw: string) => `Invalid date: "${raw}"`,
    valorInvalido: (raw: string) => `Invalid amount: "${raw}"`,
    tipoDesconhecido: (raw: string) => `Unknown type: "${raw}"`,
    transferenciaNaoImporta:
      "A transfer cannot be imported. Record it on the Reserves screen, which writes the movement and the statement together.",
    valorZerado: "Zero amount",
    semSocio: (tipo: "APORTE" | "DISTRIBUICAO") =>
      `${tipo === "APORTE" ? "Capital" : "Distribution"} without the "socio" column filled in`,
    semDescricao: "(no description)",
    modeloExemploDescReceita: "Invoice 042 - August sprint",
    modeloExemploDescDespesa: "Google Workspace",
    modeloExemploDescBolso: "Claude Pro",
    modeloExemploDescDist: "Profit distribution",
    modeloExemploSocio: "Partner name",
    modeloExemploObsBolso: "paid out of pocket",
  },

  simples: {
    faixasNaoCadastradas: (anexo: string) =>
      `Anexo ${anexo} brackets are not registered. Run "npm run db:seed".`,
    rbt12AcimaTeto:
      "RBT12 above the Simples ceiling. The company was probably disqualified — the rate below is only an extrapolation of the last bracket. Talk to the accountant.",
  },

  email: {
    lang: "en-US",
    assunto: "Your access to FinanceOps",
    titulo: "Sign in to FinanceOps",
    corpo: (minutos: number) =>
      `Click the button below to sign in. The link is valid for <strong>${minutos} minutes</strong> and works once.`,
    botao: "Open FinanceOps",
    seNaoFuncionar: "If the button does not work, copy this address:",
    rodape: (host: string) =>
      `If you did not request this access, ignore this email — no one gets in without clicking the link. Sent by ${host}.`,
    textoLink: (minutos: number) => `Sign in with this link (valid for ${minutos} minutes, single use):`,
    textoRodape: "If you did not request this access, ignore this email.",
  },

  errors: {
    sessaoExpirada: "Session expired or access revoked. Sign in again.",
    valorMaiorQueZero: "Enter an amount greater than zero.",
    impostoNegativo: "Tax cannot be negative.",
    impostoMaiorQueBruto: "Tax cannot be larger than the gross revenue amount.",
    selecioneSocio: "Select the partner.",
    receitaComImpostoPago:
      "This revenue has tax already paid. Reverse the bill in /taxes before deleting.",
    valorInvalido: "Invalid amount.",

    deNomeCaixinha: "Give the reserve a name.",
    caixinhaJaExiste: (nome: string) => `There is already a reserve named "${nome}".`,
    resgateAntesDeArquivar:
      "Withdraw all the money before archiving — an archived reserve with a balance disappears from the panel and the money becomes invisible.",
    resgateAntesDeExcluir: "Withdraw all the money before deleting.",
    caixinhaComHistorico:
      "This reserve has history. Archive it instead of deleting — deleting would remove the transfers from the statement and change the account balance retroactively.",
    caixinhaNaoEncontrada: "Reserve not found.",
    movimentoNaoEncontrado: "Movement not found.",
    depositoSaldoNegativo:
      "Deleting this deposit would leave the reserve with a negative balance. Undo the later withdrawals first.",

    selecioneArquivoCsv: "Choose a CSV file.",
    arquivoPrecisaColunas: (colunas: string) =>
      `The file needs at least the "data" and "valor" columns. Columns found: ${colunas}.`,
    socioNaoCadastrado: (socio: string) =>
      `Partner "${socio}" is not registered. Add them in Settings → Partners.`,
    nenhumaLinhaValida: "No valid rows to import.",

    informeNomeSocio: "Enter the partner's name.",
    informeNomeCliente: "Enter the client's name.",
    emailJaNoSocio: (email: string, nome: string) => `The email ${email} is already on partner ${nome}.`,
    socioNaoEncontrado: "Partner not found.",
    emailInvalido: "Invalid email.",
    emailJaNoSocioUnico: (email: string, nome: string) =>
      `The email ${email} is already on partner ${nome}. Each address belongs to one person only.`,
    clienteJaCadastrado: (nome: string) => `The client "${nome}" is already registered.`,
    categoriaImpostoNaoExclui: "The tax category cannot be deleted.",

    selecioneUmaGuia: "Select at least one bill.",
    nenhumaGuiaProvisionada: "No provisioned bill found.",

    selecioneBackupJson: "Choose the backup file (.json).",
    arquivoNaoJson:
      "File is not valid JSON. Check that you downloaded the full backup, not the CSV.",
    backupInconsistente: (problemas: string) => `Inconsistent backup: ${problemas}`,

    smtpNaoConfigurado:
      "SMTP is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS and EMAIL_FROM.",
    servidorEmailRecusou: (recusados: string) => `The email server rejected: ${recusados}`,
    naoConsegueEnviarEmail: "Couldn't send the email. Let whoever runs the server know.",

    saldoContaInsuficiente: (disp: string, tentou: string) =>
      `Not enough in the account: ${disp} available and you tried to set aside ${tentou}.`,
    caixinhaSemSaldoResgate: (tem: string, tentou: string) =>
      `The reserve holds ${tem}; cannot withdraw ${tentou}.`,

    corpoInvalidoJson: "Invalid body: JSON expected.",
    campoTipoInvalido:
      "Field 'tipo' must be ENTRADA, SAIDA, DISTRIBUICAO or APORTE. Transfers between account and reserve are not created by this route.",
    campoValorCentavos: "Field 'valorCentavos' must be a positive integer (in cents).",
    campoDescricaoObrigatorio: "Field 'descricao' is required.",
    campoDataCompetencia: "Field 'dataCompetencia' must be in YYYY-MM-DD format.",
    referenciaExternaExiste: "A transaction with this referenciaExterna already exists.",
    falhaGravar: (msg: string) => `Failed to save: ${msg}`,
    campoNomeObrigatorio: "Field 'nome' is required.",
    naoAutorizadoBearer:
      "Unauthorized. Send the header Authorization: Bearer <API_TOKEN>.",

    emailValido: "Enter a valid email.",
    seCadastradoChega: "If this email is registered, the access link will arrive in a moment.",

    authSecretAusente: "AUTH_SECRET missing or too short. Generate one with: openssl rand -base64 32",
  },
};
