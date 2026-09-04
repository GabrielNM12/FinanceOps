/**
 * Dicionário pt-BR. É a referência estrutural: `en.ts` é tipado como `typeof pt`.
 *
 * Strings com interpolação são funções. Plural fica no estilo "guia(s)" nas duas
 * línguas — sem motor de plural, a função do dicionário resolve o texto inteiro.
 *
 * Termos fiscais brasileiros (Simples Nacional, DAS, Fator R, RBT12, pró-labore,
 * Anexo III/V, Competência/Caixa como regime) NÃO são traduzidos no en.ts.
 */
export const pt = {
  // -----------------------------------------------------------------------
  common: {
    save: "Salvar",
    saving: "Salvando...",
    saveShort: "salvar",
    cancel: "Cancelar",
    cancelLower: "cancelar",
    confirm: "Confirmar",
    delete: "excluir",
    remove: "remover",
    add: "Adicionar",
    clear: "limpar",
    close: "fechar",
    edit: "Editar",
    manage: "gerenciar",
    dash: "—",
    optional: "(opcional)",
    all_f: "Todas",
    everything: "Tudo",
    retry: "Tentar novamente",
    loadError: "Não consegui carregar esta tela",
    loading: "Carregando dados…",
    noResponse: "Sem resposta do servidor. Ele ainda está rodando?",
    httpFail: (status: number) => `Falha ao carregar (HTTP ${status})`,
    date: "Data",
    description: "Descrição",
    value: "Valor",
    category: "Categoria",
    client: "Cliente",
    partner: "Sócio",
    type: "Tipo",
  },

  meta: {
    title: "FinanceOps — Korvantis",
    description: "Controle de caixa, impostos e distribuição entre sócios",
  },

  // -----------------------------------------------------------------------
  nav: {
    dashboard: "Dashboard",
    dashboardHint: "Posição consolidada",
    transactions: "Lançamentos",
    transactionsHint: "Receitas, despesas e distribuições",
    taxes: "Impostos",
    taxesHint: "Provisões e guias",
    reserves: "Caixinhas",
    reservesHint: "Dinheiro separado por objetivo",
    recurring: "Recorrentes",
    recurringHint: "Gastos fixos mensais",
    import: "Importar",
    importHint: "CSV de entrada e saída",
    audit: "Auditoria",
    auditHint: "Quem fez o quê no sistema",
    settings: "Configurações",
    settingsHint: "Sócios, clientes, categorias e fiscal",
    openMenu: "Abrir menu",
    closeMenu: "Fechar menu",
    account: "Acesso",
    demoNote: "Sem login. Autoria dos lançamentos atribuída a este sócio.",
    signingOut: "Saindo...",
    signOut: "Sair",
    disclaimer:
      "Os cálculos de imposto são estimativas. Confirme com seu contador antes de qualquer decisão.",
  },

  // -----------------------------------------------------------------------
  dates: {
    monthsShort: ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"],
  },

  money: {
    invalid: "Valor inválido",
    invalidMoney: (raw: string) => `Valor monetário inválido: "${raw}"`,
    invalidPercent: (raw: string) => `Percentual inválido: "${raw}"`,
  },

  // -----------------------------------------------------------------------
  skeleton: {
    loadError: "Não consegui carregar esta tela",
  },

  // -----------------------------------------------------------------------
  charts: {
    noData: "Sem dados no período.",
    billed: "Faturado",
    expenses: "Despesas",
    taxes: "Impostos",
    profit: "Lucro",
    revenue: "Receita",
    profits: "Lucros",
    proLabore: "Pró-labore",
    projectedBalance: "Saldo projetado",
  },

  // -----------------------------------------------------------------------
  dashboard: {
    title: "Dashboard",
    subtitle: (mes: string) => `Posição consolidada — ${mes}`,
    subtitleLoading: "Carregando posição consolidada…",
    regimeLabel: "Regime:",
    regimeCompetencia: "Competência",
    regimeCompetenciaHint: "Considera o mês em que o serviço foi faturado",
    regimeCaixa: "Caixa",
    regimeCaixaHint: "Considera o mês em que o dinheiro entrou ou saiu",

    caixaLivreNegTitle: "Caixa livre negativo.",
    caixaLivreNeg: (conta: string, imposto: string) =>
      `O saldo em conta (${conta}) não cobre ${imposto} de imposto sobre receita já recebida. Não distribua lucro até resolver isso — se precisar, resgate de uma caixinha.`,
    impostoAReceberStrong: (v: string) => `${v} de imposto`,
    impostoAReceber: (aReceber: string) =>
      `está provisionado sobre receita que ainda não entrou (${aReceber} a receber). Esse valor `,
    impostoAReceberNao: "não",
    impostoAReceberFim:
      "reduz o caixa livre acima — mas o DAS vence pelo faturamento, não pelo recebimento. Se o cliente atrasar, a guia vence do mesmo jeito.",
    guiasVencendoStrong: (n: number) => `${n} guia(s)`,
    guiasVencendo: (total: string) =>
      `de imposto vencendo nos próximos 15 dias, somando ${total}. `,
    verImpostos: "Ver impostos",

    kpiEmConta: "Em conta",
    kpiEmContaDetalhe: (patrimonio: string) => `Patrimônio total ${patrimonio}`,
    kpiCaixaLivre: "Caixa livre",
    kpiCaixaLivreDetalhe: (imposto: string) => `Conta − ${imposto} de imposto sobre recebido`,
    kpiGuardado: "Guardado",
    kpiGuardadoDetalhe: (n: number) => `${n} caixinha(s)`,
    kpiAReceber: "A receber",
    kpiAReceberComImposto: (v: string) => `Carrega ${v} de imposto`,
    kpiAReceberSemImposto: "Faturado e ainda não recebido",
    kpiAPagar: "A pagar",
    kpiAPagarDetalhe: (v: string) => `Inclui ${v} de imposto em aberto`,
    kpiFaturadoMes: "Faturado no mês",
    kpiImpostos: "Impostos",
    kpiDespesas: "Despesas",
    kpiLucro: "Lucro",
    kpiDistribuido: "Distribuído",
    kpiDistribuidoDetalhe: (v: string) => `Retido: ${v}`,

    fluxoTitulo: (meses: number, regime: string) =>
      `Fluxo de caixa — últimos ${meses} meses (${regime})`,
    fluxoRegimeCaixa: "regime de caixa",
    fluxoRegimeCompetencia: "competência",
    mesesSufixo: (n: number) => `${n}m`,

    despesasPorCategoria: "Despesas por categoria",
    receitaPorCliente: "Receita por cliente",
    distribuidoPorSocio: "Distribuído por sócio (acumulado)",
    projecaoTitulo: "Projeção de caixa — 6 meses",
    projecaoNota:
      "Considera recorrentes ativos, compromissos já lançados e guias de imposto com vencimento no período. Não grava nada no banco.",
    caixinhasTitulo: "Caixinhas",
    caixinhasVaziasPre: "Nenhuma caixinha ainda.",
    caixinhasVaziasLink: "Crie uma",
    caixinhasVaziasPos: "para separar dinheiro por objetivo.",
    caixinhasNota:
      "Guardar tira da conta e põe na caixinha — o patrimônio total não muda, mas o caixa livre sim. Cada movimento aparece no extrato como transferência.",

    thSocio: "Sócio",
    thLucros: "Lucros",
    thProLabore: "Pró-labore",
    thTotal: "Total",

    fatorRTitulo: "Fator R",
    fatorRExplica:
      "Folha (pró-labore) dividida pela receita dos últimos 12 meses. Em 28% ou mais, a empresa se enquadra no Anexo III, que começa em 6,00% — abaixo disso, Anexo V, que começa em 15,50%.",
    fatorRAnexo: (anexo: string) => `Anexo ${anexo}`,
    fatorRRbt12: "RBT12",
    fatorRFolha: "Folha 12 meses",
    fatorRMargem: "Margem sobre o limite",
    fatorRFalta: "Falta para o Anexo III",
    fatorRLimite28: "Limite de 28%",
    fatorRZona:
      "Vocês estão na zona de atenção (entre 26% e 30%). Uma variação pequena de faturamento ou de pró-labore muda o anexo e a alíquota. Vale conversar com o contador antes de fechar a próxima distribuição.",
  },

  // -----------------------------------------------------------------------
  transactions: {
    title: "Lançamentos",
    subtitle: "Todo o movimento de caixa da empresa, em ordem de competência.",
    exportCsv: "Exportar CSV",

    tipoReceita: "Receita",
    tipoDespesa: "Despesa",
    tipoDistribuicao: "Distribuição",
    tipoAporte: "Aporte",
    tipoTransferencia: "Transferência",

    filtroBuscar: "Buscar",
    filtroBuscarPlaceholder: "descrição...",
    filtroTipo: "Tipo",
    filtroCliente: "Cliente",
    filtroSituacao: "Situação",
    optTodos: "Todos",
    optReceitas: "Receitas",
    optDespesas: "Despesas",
    optDistribuicoes: "Distribuições",
    optAportes: "Aportes",
    optTransferencias: "Transferências",
    optTodasSituacoes: "Todas",
    optPendentes: "Pendentes",
    optLiquidadas: "Liquidadas",
    filtrar: "Filtrar",

    vazioComFiltro: "Nenhum lançamento com esses filtros.",
    vazioPre: "Nenhum lançamento ainda. Use",
    vazioNovo: "Novo lançamento",
    vazioMeio: "acima ou importe um extrato em",
    vazioLink: "Importar",

    thCompetencia: "Competência",
    thDescricao: "Descrição",
    thTipo: "Tipo",
    thClienteCategoria: "Cliente / Categoria",
    thValor: "Valor",
    thImposto: "Imposto",
    thCaixa: "Caixa",

    pagoPor: "pago por ",
    recorrente: "recorrente",
    lancadoPor: (nome: string) => `lançado por ${nome}`,
    pendente: "pendente",
    liquidado: (data: string) => `liquidado ${data}`,
    impostoLabel: "imposto",
    marcarPendente: "Marcar como pendente",
    desfazer: "desfazer",
    confirmar: "confirmar",

    truncado: (limite: number, total: number) =>
      `Mostrando ${limite} de ${total} lançamentos. Use os filtros para refinar.`,
  },

  // -----------------------------------------------------------------------
  forms: {
    novoLancamento: "Novo lançamento",
    fecharFormulario: "Fechar formulário",
    abaReceita: "Receita",
    abaDespesa: "Despesa",
    abaDistribuicao: "Distribuição / Pró-labore",
    abaAporte: "Aporte",
    salvando: "Salvando...",
    registrarReceita: "Registrar receita",
    registrarDespesa: "Registrar despesa",
    registrar: "Registrar",
    registrarAporte: "Registrar aporte",

    descricao: "Descrição",
    valorBruto: "Valor bruto",
    valor: "Valor",
    cliente: "Cliente",
    categoria: "Categoria",
    dataFaturamento: "Data de faturamento",
    dataRecebimento: "Data de recebimento",
    observacoes: "Observações",
    clienteOpcional: "Cliente (opcional)",
    pagoPor: "Pago por",
    dataDespesa: "Data da despesa",
    dataPagamento: "Data do pagamento",
    socio: "Sócio",
    natureza: "Natureza",
    competencia: "Competência",
    descricaoOpcional: "Descrição (opcional)",
    data: "Data",

    phReceita: "NF 042 — Sprint de agosto",
    phValorReceita: "15.000,00",
    phDespesa: "AWS — agosto",
    phValorDespesa: "1.240,90",
    phValorDistribuicao: "5.000,00",
    phAporte: "Aporte de capital",
    phImpostoValor: "0,00",

    semCliente: "— sem cliente —",
    despesaGeral: "— despesa geral —",
    empresa: "Empresa",
    doProprioBolso: (nome: string) => `${nome} (do próprio bolso)`,
    selecione: "Selecione...",
    natLucro: "Distribuição de lucros",
    natProLabore: "Pró-labore",
    natReembolso: "Reembolso",

    aReceberHint: 'Deixe vazio se ainda não recebeu — entra como "a receber".',
    naoPagoHint: "Vazio = ainda não pago.",
    margemHint: "Vincular a um cliente habilita o cálculo de margem.",
    bolsoHint: "Marque o sócio quando ele adiantou do próprio bolso.",
    aporteHint:
      "Aporte entra no caixa mas não é receita — não gera imposto e não aparece como faturamento.",

    impostoBloco: "Imposto (Simples Nacional)",
    semIncidencia: "Receita sem incidência",
    numBruto: "Bruto",
    numAliquota: (anexo: string, faixa: number) => `Alíquota (Anexo ${anexo}, faixa ${faixa})`,
    numImposto: "Imposto",
    numLiquido: "Líquido",
    impostoNota: (rbt12: string) =>
      `Calculado sobre um RBT12 de ${rbt12}. A guia vence no dia 20 do mês seguinte e fica provisionada até você registrar o pagamento.`,
    ajustarManual: "Ajustar manualmente",
    usarAutomatico: "Usar o cálculo automático",
    aliquotaPct: "Alíquota (%)",
    ouValorImposto: "Ou valor do imposto",
    valorPrevalece: "Se preencher o valor, ele prevalece sobre a alíquota.",
    informeValor: "Informe o valor para ver a alíquota e o líquido.",

    natExplicaLucro:
      "Não é despesa da empresa e não conta no Fator R. É a destinação do lucro já apurado.",
    natExplicaProLabore:
      "É despesa da empresa e CONTA no Fator R — é o que pode levar vocês ao Anexo III. Tem encargos próprios (INSS/IRRF) que não são calculados aqui.",
    natExplicaReembolso:
      "Devolução de dinheiro que o sócio adiantou. Não é despesa nova — a despesa original já foi lançada quando ele pagou.",
  },

  // -----------------------------------------------------------------------
  taxes: {
    title: "Impostos",
    subtitle: "Provisões geradas por receita e guias efetivamente pagas.",

    kpiSobreRecebida: "Sobre receita recebida",
    kpiSobreRecebidaDetalhe: "É o que reduz o caixa livre",
    kpiSobreAReceber: "Sobre a receber",
    kpiSobreAReceberDetalhe: (n: number) => `${n} guia(s) sem lastro em caixa`,
    kpiVencido: "Vencido",
    kpiVencidoDetalhe: (n: number) => `${n} guia(s) em atraso`,
    kpiDasEstimado: (mes: string) => `DAS estimado — ${mes}`,
    kpiDasEstimadoDetalhe: (v: string) => `Sobre ${v} faturados`,
    aliquotaVigente: "Alíquota vigente",
    aliquotaVigenteDetalhe: (anexo: string, faixa: number, nominal: string) =>
      `Anexo ${anexo}, faixa ${faixa} — nominal ${nominal}`,

    riscoStrong: (n: number, total: string) => `${n} guia(s) somando ${total}`,
    risco:
      "vencem nos próximos 15 dias e são de receita que ainda não foi recebida. O DAS vence pelo faturamento, não pelo recebimento — se o cliente não pagar antes, esse valor sai do caixa mesmo assim. Cobre o cliente ou garanta o saldo.",

    formulaPre: "A alíquota efetiva sai de",
    formula: (nominal: string, deducao: string) => `(RBT12 × ${nominal} − ${deducao}) ÷ RBT12`,
    formulaPos: (rbt12: string, fatorR: string) =>
      `, com RBT12 de ${rbt12}. O anexo vem do Fator R atual (${fatorR}). Confira as faixas em Configurações antes de fechar o mês.`,
  },

  // -----------------------------------------------------------------------
  taxPanel: {
    provisoesAbertas: (n: number) => `Provisões em aberto (${n})`,
    selecionarVencidas: "Selecionar vencidas",
    selecionarComLastro: "Selecionar com lastro",
    recalcular: "Recalcular provisões",
    recalcularResultado: (alterados: number, total: number) =>
      `${alterados} de ${total} provisões atualizadas com a alíquota vigente.`,
    vazioAbertas:
      "Nenhuma guia em aberto. Toda receita lançada provisiona o DAS automaticamente.",

    thReceita: "Receita",
    thLastro: "Lastro",
    thCompetencia: "Competência",
    thVencimento: "Vencimento",
    thAliquota: "Alíquota",
    thValor: "Valor",
    badgeRecebida: "recebida",
    badgeAReceber: "a receber",
    badgeAReceberTitle:
      "A receita ainda não entrou na conta. Esta provisão não reduz o caixa livre — mas a guia vence do mesmo jeito.",
    manual: "manual",
    anexoAbrev: (anexo: string) => `(An. ${anexo})`,
    venceMobile: (data: string) => `· vence ${data}`,

    semLastroAviso: (n: number) =>
      `${n} guia(s) selecionada(s) são de receita que `,
    semLastroAvisoBold: "ainda não foi recebida",
    semLastroAvisoFim:
      ". Pagá-las é legítimo — o DAS vence pelo faturamento — mas o dinheiro sai de um caixa livre que não contava com elas. Confira o saldo antes de confirmar.",

    selecionadas: (n: number) => `${n} guia(s) selecionada(s)`,
    dataPagamento: "Data do pagamento",
    registrando: "Registrando...",
    registrarPagamento: "Registrar pagamento",
    pagamentoRegistrado: (valor: string, data: string) =>
      `Guia de ${valor} registrada como paga em ${data}.`,
    pagamentoNota:
      "O pagamento gera uma única saída de caixa para o conjunto — é assim que o DAS aparece no extrato bancário.",

    guiasPagas: "Guias pagas",
    vazioPagas: "Nenhuma guia paga ainda.",
    thPagamento: "Pagamento",
    thData: "Data",
    thReceitas: "Receitas",
    estornar: "estornar",
    estornado: "Pagamento estornado. As provisões voltaram a aberto.",
  },

  // -----------------------------------------------------------------------
  reserves: {
    title: "Caixinhas",
    subtitle: "Separe dinheiro por objetivo. Guardar tira da conta e põe na caixinha.",
    nova: "Nova caixinha",

    kpiEmConta: "Em conta",
    kpiEmContaDetalhe: "Disponível para movimentar",
    kpiGuardado: "Guardado",
    kpiGuardadoDetalhe: (n: number) => `${n} caixinha(s) ativa(s)`,
    kpiPatrimonio: "Patrimônio",
    kpiPatrimonioDetalhe: "Conta + caixinhas",
    kpiCaixaLivre: "Caixa livre",
    kpiCaixaLivreDetalhe: "Conta menos imposto sobre recebido",

    vazio:
      "Nenhuma caixinha ainda. Crie uma para separar dinheiro por objetivo — reserva de emergência, 13º, equipamento, provisão de imposto.",
    atualizada: "Caixinha atualizada.",
    criada: "Caixinha criada.",
    novoSaldo: (nome: string, saldo: string) => `${nome} agora tem ${saldo}.`,

    arquivadas: "Arquivadas",
    reativar: "reativar",

    notaRodape:
      "Guardar é uma transferência entre bolsos seus: o dinheiro sai da conta e entra na caixinha, e cada movimento aparece no extrato como Transferência. Não é receita nem despesa — o lucro do mês não muda quando você guarda. O que muda é o caixa livre, porque o dinheiro deixou de estar disponível.",
    notaRodapeTransferencia: "Transferência",

    editarTitle: "Editar",
    metaLabel: (v: string) => `Meta ${v}`,
    metaAte: (data: string) => ` até ${data}`,
    metaAtingida: "Meta atingida",
    metaFaltam: (v: string) => `Faltam ${v}`,

    guardar: "Guardar",
    resgatar: "Resgatar",
    historico: (n: number) => `histórico (${n})`,
    phValorMov: "1.000,00",
    phDescMov: "Descrição (opcional)",
    dispEmConta: (v: string) => `Disponível em conta: ${v}`,
    nestaCaixinha: (v: string) => `Nesta caixinha: ${v}`,
    confirmarCurto: "...",
    nenhumMovimento: "Nenhum movimento ainda.",
    movDeposito: "Depósito",
    movResgate: "Resgate",
    excluirMovTitle: "Excluir movimento e a transferência do extrato",
    arquivarCaixinha: "arquivar caixinha",

    formEditar: (nome: string) => `Editar ${nome}`,
    formNova: "Nova caixinha",
    fNome: "Nome",
    fMeta: "Meta (opcional)",
    fMetaData: "Até quando (opcional)",
    fObservacoes: "Observações",
    fCor: "Cor",
    fIcone: "Ícone",
    phNome: "Reserva de emergência",
    phMeta: "30.000,00",
    corAria: (cor: string) => `Cor ${cor}`,
    criarCaixinha: "Criar caixinha",
  },

  // -----------------------------------------------------------------------
  recurring: {
    title: "Recorrentes",
    subtitle: "Regras que geram lançamentos automaticamente todo mês.",
    gerarAgora: "Gerar pendentes agora",
    nadaPendente: "Nada pendente — todos os meses vencidos já foram gerados.",
    gerados: (n: number) => `${n} lançamento(s) gerado(s).`,
    criado: "Recorrente criado. Os meses já vencidos foram gerados.",

    kpiSaidas: "Saídas fixas / mês",
    kpiEntradas: "Entradas fixas / mês",
    kpiResultado: "Resultado fixo / mês",

    novo: "Novo recorrente",
    fDescricao: "Descrição",
    fTipo: "Tipo",
    fValor: "Valor",
    fCategoria: "Categoria",
    fDiaVencimento: "Dia do vencimento",
    fInicio: "Início",
    fFim: "Fim (opcional)",
    phDescricao: "Google Workspace",
    phValor: "245,00",
    optSaida: "Saída",
    optEntrada: "Entrada",
    criarRecorrente: "Criar recorrente",
    novoNota:
      "Ao salvar, os meses já vencidos desde a data de início são gerados na hora, como lançamentos pendentes de pagamento.",

    vazio: "Nenhum recorrente cadastrado.",
    thDescricao: "Descrição",
    thCategoria: "Categoria",
    thVencimento: "Vencimento",
    thPeriodo: "Período",
    thValor: "Valor",
    thGerados: "Gerados",
    tagEntrada: "entrada",
    tagSaida: "saída",
    dia: (n: number) => `dia ${n}`,
    semFim: "sem fim",
    geradosLabel: (n: number) => `${n} gerados`,
    pausar: "pausar",
    reativar: "reativar",
    notaRodape:
      "Os lançamentos são materializados como registros reais, não calculados na hora. Isso permite editar o valor do mês (a conta de luz nunca vem igual) e faz o histórico bater com o extrato bancário. Excluir a regra não apaga os lançamentos já gerados.",
  },

  // -----------------------------------------------------------------------
  importPage: {
    title: "Importar e exportar",
    subtitle:
      "Extrato do banco em CSV, ou backup completo para restaurar o sistema inteiro.",
    backupCompleto: "Backup completo",
    lancamentos: "Lançamentos",
    impostos: "Impostos",
    tabCsv: "Extrato CSV",
    tabBackup: "Backup completo",
    importacoesAnteriores: "Importações anteriores",
    thArquivo: "Arquivo",
    thData: "Data",
    thLinhas: "Linhas",
    thImportadas: "Importadas",
    thIgnoradas: "Ignoradas",
  },

  // -----------------------------------------------------------------------
  importer: {
    passo1: "1. Selecione o arquivo",
    arquivoCsv: "Arquivo CSV",
    analisando: "Analisando...",
    analisar: "Analisar",
    formatoTitulo: "Formato esperado",
    formatoP1Pre: "Colunas reconhecidas (em qualquer ordem, nomes flexíveis): ",
    formatoP1Pos: ". Só ",
    formatoP1Fim: " são obrigatórias.",
    formatoP2Pre: " aceita ",
    formatoP2Meio: ". Em distribuição, ",
    formatoP2MeioB: " escolhe entre ",
    formatoP2Fim:
      " — e a coluna socio passa a ser obrigatória, com o nome exatamente como está cadastrado.",
    formatoP3:
      "Aceita separador ; ou , , valores como 1.234,56 e datas dd/mm/aaaa. Sem coluna tipo, valor negativo vira despesa. Deixe data_caixa vazio para o lançamento entrar como pendente. ",
    baixarModelo: "Baixar modelo",

    passo2: (arquivo: string) => `2. Confira antes de gravar — ${arquivo}`,
    contLinhas: "Linhas",
    contValidas: "Válidas",
    contJaImportadas: "Já importadas",
    contComErro: "Com erro",
    duplicadasAviso: (n: number) =>
      `${n} linha(s) já existem no banco (mesma data, valor e descrição) e serão puladas. É o que permite reimportar o extrato do mês inteiro sem duplicar nada.`,

    thHash: "#",
    thData: "Data",
    thDescricao: "Descrição",
    thTipo: "Tipo",
    thCategoria: "Categoria",
    thClienteSocio: "Cliente / Sócio",
    thValor: "Valor",
    thSituacao: "Situação",

    tipoReceita: "receita",
    tipoDespesa: "despesa",
    tipoAporte: "aporte",
    tipoProLabore: "pró-labore",
    tipoReembolso: "reembolso",
    tipoLucro: "lucro",
    jaImportada: "já importada",
    ok: "ok",

    provisionarLabel: "Provisionar DAS sobre as receitas importadas",
    provisionarSub:
      "Desmarque só se o imposto dessas receitas já estiver lançado — senão o mês entra sem imposto e o lucro fica inflado.",
    importando: "Importando...",
    importarN: (n: number) => `Importar ${n} lançamento(s)`,
    resultado: (importadas: number, ignoradas: number) =>
      `${importadas} lançamento(s) importado(s), ${ignoradas} ignorado(s).`,
  },

  // -----------------------------------------------------------------------
  restore: {
    passo1: "1. Selecione o backup",
    baixarAgora: "Baixar backup de agora",
    arquivoJson: "Arquivo .json",
    lendo: "Lendo...",
    analisar: "Analisar",
    explica:
      "O backup completo carrega tudo: sócios, clientes, categorias, caixinhas, recorrentes, lançamentos e as provisões de imposto com a alíquota que valia na época. O CSV de lançamentos, ao lado, não faz isso — ele recalcularia o DAS com as regras de hoje.",

    passo2: "2. Confira antes de gravar",
    meta: (arquivo: string, data: string, versao: number) =>
      `${arquivo} · gerado em ${data} · versão ${versao}`,
    inconsistente: "Backup inconsistente.",

    thTabela: "Tabela",
    thNoBanco: "No banco hoje",
    thNoBackup: "No backup",

    modoSubstituirTitulo: "Substituir tudo",
    modoSubstituirDesc:
      "— restauração de verdade. Apaga o conteúdo atual e recria o banco a partir do arquivo. O resultado fica idêntico ao original, IDs inclusive.",
    modoMesclarTitulo: "Mesclar",
    modoMesclarDesc:
      "— só o que falta. Insere apenas registros que ainda não existem. Nada é sobrescrito: um lançamento editado depois do backup fica como está.",

    confirmacao: (n: number) =>
      `Entendo que os ${n} registros que estão no banco agora serão apagados e substituídos pelo conteúdo deste arquivo. Não há desfazer.`,

    restaurando: "Restaurando...",
    substituirTudo: "Substituir tudo",
    mesclar: "Mesclar",
    resultadoSubstituir: (total: number) => `Banco restaurado: ${total} registros gravados.`,
    resultadoMesclar: (total: number, pulado: number) =>
      `${total} registro(s) inserido(s), ${pulado} já existiam e foram mantidos.`,
  },

  // -----------------------------------------------------------------------
  audit: {
    title: "Auditoria",
    subtitle: "Quem fez o quê, e quando. Registro só de leitura.",
    filtroPessoa: "Pessoa",
    filtroOnde: "Onde",
    filtroAcao: "Ação",
    vazioComFiltro: "Nenhum evento com esses filtros.",
    vazio: "Nada registrado ainda. A trilha começa no próximo lançamento.",
    truncado: (limite: number, total: number) =>
      `Mostrando ${limite} de ${total} eventos. Use os filtros para refinar.`,
    appendOnlyPre: "A trilha é",
    appendOnlyBold: "append-only",
    appendOnly:
      ': nada aqui é editado ou apagado pela aplicação. Um registro que o próprio sistema pode alterar não serve para auditar o sistema. Restaurar um backup no modo "substituir tudo" apaga a trilha anterior — mas o próprio evento de restauração fica gravado logo depois.',
  },

  auditLabels: {
    verbos: {
      CRIAR: "criou",
      ATUALIZAR: "alterou",
      EXCLUIR: "excluiu",
      CONFIRMAR: "confirmou",
      DESFAZER: "desfez",
      PAGAR: "pagou",
      ESTORNAR: "estornou",
      GUARDAR: "guardou",
      RESGATAR: "resgatou",
      IMPORTAR: "importou",
      RESTAURAR: "restaurou",
      ACESSO: "acessou",
    },
    entidades: {
      LANCAMENTO: "lançamento",
      IMPOSTO: "imposto",
      CAIXINHA: "caixinha",
      SOCIO: "sócio",
      CLIENTE: "cliente",
      CATEGORIA: "categoria",
      RECORRENTE: "recorrente",
      BACKUP: "backup",
      CONFIG: "configuração",
    },
  },

  // -----------------------------------------------------------------------
  settings: {
    title: "Configurações",
    subtitle: "Sócios, clientes, categorias e parâmetros fiscais.",

    secSocios: "Sócios",
    secClientes: "Clientes",
    secCategorias: "Categorias",
    secRegime: "Regime tributário",
    secFaixas: "Faixas do Simples Nacional",
    secBackup: "Backup",

    participacaoAviso: (soma: string) =>
      `As participações somam ${soma} em vez de 100%. Com 6 sócios em partes iguais o certo é 16,67% para quatro deles e 16,66% para dois — 16,67% em todos daria 100,02%.`,

    fNome: "Nome",
    fEmail: "E-mail",
    fParticipacao: "Participação (%)",
    phParticipacao: "16,67",
    fNomeCliente: "Nome do cliente",
    phCliente: "ACME Ltda",
    fNatureza: "Natureza",
    fCor: "Cor",
    optDespesa: "Despesa",
    optReceita: "Receita",

    thSocio: "Sócio",
    thEmail: "E-mail",
    thParticipacao: "Participação",
    thJaRecebeu: "Já recebeu",
    thTotal: "Total",
    thCliente: "Cliente",
    thReceita: "Receita",
    thImpostos: "Impostos",
    thDespesas: "Despesas",
    thMargem: "Margem",
    thPct: "%",
    thAnexo: "Anexo",
    thFaixa: "Faixa",
    thRbt12: "RBT12",
    thAliquotaDeducao: "Alíquota nominal e dedução",

    inativar: "inativar",
    reativar: "reativar",
    inativo: "inativo",
    tagReceita: "receita",
    tagDespesa: "despesa",
    tagImposto: "imposto",

    emailAlterado: (nome: string, email: string) =>
      `Acesso de ${nome} agora é ${email}. O endereço anterior perdeu o acesso na hora.`,
    emailRemovido: (nome: string) => `${nome} ficou sem e-mail e não consegue mais entrar.`,

    sociosNota1:
      "Sócio com distribuição registrada não é excluído, só inativado — apagar levaria embora o histórico de quem recebeu o quê.",
    sociosNota2:
      "O e-mail é a identidade de login: só endereços listados aqui, em sócios ativos, recebem link de acesso. Ao trocar um endereço, o anterior perde o acesso imediatamente — sessões abertas caem e links já enviados param de valer.",

    clientesVazio:
      "Nenhum cliente cadastrado. Eles aparecem no seletor ao lançar uma receita, e também são criados automaticamente ao importar um CSV com a coluna cliente.",
    clientesNota:
      "Margem = receita − impostos provisionados sobre ela − despesas vinculadas ao cliente. Despesas gerais (contabilidade, escritório) não entram: não pertencem a um cliente específico e ratear distorceria a comparação. Cliente com lançamento é inativado em vez de excluído.",

    categoriasNota:
      "A natureza decide em qual formulário a categoria aparece. A categoria marcada como imposto é onde as guias de DAS são lançadas — ela não pode ser excluída, e só pode existir uma.",

    anexoDoSimples: "Anexo do Simples",
    optAuto: "Automático (pelo Fator R)",
    optForcarIII: "Forçar Anexo III",
    optForcarV: "Forçar Anexo V",
    anexoAtualizado: "Anexo atualizado.",
    anexoNota:
      "Deixe automático a menos que seu contador determine o contrário. No automático, o anexo é recalculado a cada lançamento a partir da relação pró-labore ÷ receita dos últimos 12 meses.",
    diaVencimentoDas: "Dia de vencimento do DAS",
    diaAtualizado: "Dia de vencimento atualizado.",
    diaNota: "Usado para calcular o vencimento das provisões. Não ajusta para dia útil.",

    faixasAviso:
      "Estes valores vieram de um seed e devem ser conferidos com seu contador. Alterar uma faixa muda apenas os cálculos futuros e as provisões em aberto que você recalcular — guias já pagas nunca são reescritas.",
    faixaAtualizada: (faixa: number, anexo: string) =>
      `Faixa ${faixa} do Anexo ${anexo} atualizada.`,
    faixaOrdinal: (n: number) => `${n}ª`,
    faixaAte: "até",

    backupTextoPre: "O banco inteiro é um arquivo só: ",
    backupTextoMeio:
      ". Backup é copiar esse arquivo com o app parado. Para backup semanal com o app no ar, use ",
    backupTextoFim: ", que usa o comando seguro do SQLite.",
    backupGitignore:
      "de propósito — contém dados financeiros reais e não deve ir para nenhum repositório.",

    semEmail: "sem e-mail — não consegue entrar",
    alterarEmail: "Alterar e-mail de acesso",
    phEmail: "voce@korvantis.com",
  },

  // -----------------------------------------------------------------------
  login: {
    confiraEmail: "Confira seu e-mail",
    enviadoPara: (email: string) =>
      `Se ${email} estiver cadastrado, o link de acesso chega em instantes. Ele vale por 15 minutos e funciona uma vez só.`,
    usarOutro: "usar outro e-mail",
    entrar: "Entrar",
    semSenha: "Enviamos um link de acesso para o seu e-mail. Não há senha.",
    erroSessao: "Sua sessão expirou. Peça um novo link para continuar.",
    erroLink: "Este link expirou ou já foi usado. Peça um novo.",
    erroSemAcesso: "Este acesso não está mais ativo.",
    erroGenerico: "Não foi possível entrar. Tente novamente.",
    email: "E-mail",
    phEmail: "voce@korvantis.com",
    enviando: "Enviando...",
    enviarLink: "Enviar link de acesso",
    falhaEnviar: "Falha ao enviar. Tente de novo em instantes.",
    rodape: "Só e-mails cadastrados como sócio ativo têm acesso.",
  },

  // -----------------------------------------------------------------------
  demo: {
    aviso:
      "MODO DEMO — sem autenticação. Dados fictícios, qualquer pessoa com a URL tem acesso total.",
  },

  // -----------------------------------------------------------------------
  icons: {
    "piggy-bank": "Cofre",
    "shield-check": "Emergência",
    landmark: "Impostos",
    laptop: "Equipamento",
    plane: "Viagem",
    wrench: "Manutenção",
    "graduation-cap": "Capacitação",
    gift: "13º / bônus",
    "trending-up": "Investimento",
    building: "Escritório",
  },

  // -----------------------------------------------------------------------
  queries: {
    semCategoria: "Sem categoria",
    semCliente: "Sem cliente",
  },

  /**
   * Textos gerados pelo sistema e gravados como `descricao` / `observacoes` /
   * nome de categoria quando o usuário não digitou nada. NÃO inclui o `resumo`
   * da trilha de auditoria, que fica no idioma em que foi gravado.
   */
  generated: {
    proLabore: "Pró-labore",
    reembolso: "Reembolso",
    distribuicaoLucros: "Distribuição de lucros",
    comSocio: (base: string, socio: string) => `${base} — ${socio}`,
    aporteCapital: "Aporte de capital",
    guardadoEm: (nome: string) => `Guardado em ${nome}`,
    resgatadoDe: (nome: string) => `Resgatado de ${nome}`,
    transfContaParaCaixinha: "Transferência da conta para a caixinha",
    transfCaixinhaParaConta: "Transferência da caixinha para a conta",
    categoriaImpostos: "Impostos (DAS)",
    dasLancamentos: (n: number) => `DAS — ${n} lançamento(s)`,
    guiaGerada: "Guia de imposto gerada a partir de provisões.",
    recorrenteAuto: "Gerado automaticamente a partir de um recorrente.",
  },

  // -----------------------------------------------------------------------
  backup: {
    rotulos: {
      config: "Configurações",
      faixasSimples: "Faixas do Simples",
      socios: "Sócios",
      clientes: "Clientes",
      categorias: "Categorias",
      caixinhas: "Caixinhas",
      recorrentes: "Recorrentes",
      importacoes: "Histórico de importações",
      transacoes: "Lançamentos",
      impostos: "Provisões e guias",
      distribuicoes: "Distribuições",
      movimentosCaixinha: "Movimentos de caixinha",
      auditoria: "Trilha de auditoria",
    },
    naoJsonValido: "Arquivo não é um JSON válido.",
    naoEhBackup:
      "Este não parece um backup do FinanceOps. Falta o cabeçalho `financeops.versao`.",
    versaoAlta: (arquivo: number, suportada: number) =>
      `Backup na versão ${arquivo}, mas esta instalação lê no máximo a ${suportada}. Atualize o app antes de restaurar.`,
    semDados: "O arquivo não tem a seção `dados`.",
    secaoNaoLista: (rotulo: string) => `A seção "${rotulo}" deveria ser uma lista.`,
    registrosSemId: (n: number, rotulo: string) =>
      `${n} registro(s) em "${rotulo}" estão sem id. Arquivo corrompido.`,
    secaoAusente: (rotulo: string) => `"${rotulo}" não existe no arquivo — será ignorada.`,
    orfaos: (n: number, rotulo: string, campo: string) =>
      `${n} registro(s) apontam para ${rotulo} que não está no arquivo (campo ${campo}).`,
    refUmLancamento: "um lançamento",
    refUmSocio: "um sócio",
    refUmaCaixinha: "uma caixinha",
    repetidos: (rotulo: string, n: number, campo: string, amostra: string, mais: boolean) =>
      `${rotulo}: ${n} ${campo}(s) repetido(s) — ${amostra}${mais ? ", ..." : ""}.`,
    dividemCampo: (rotulo: string, n: number, campo: string, amostra: string, mais: boolean) =>
      `${rotulo}: ${n} registro(s) dividem o mesmo ${campo} — ${amostra}${mais ? ", ..." : ""}.`,
    observacaoArquivo:
      "Backup completo do FinanceOps. Restaure em Importar -> Backup completo.",
  },

  // -----------------------------------------------------------------------
  csv: {
    dataInvalida: (raw: string) => `Data inválida: "${raw}"`,
    valorInvalido: (raw: string) => `Valor inválido: "${raw}"`,
    tipoDesconhecido: (raw: string) => `Tipo desconhecido: "${raw}"`,
    transferenciaNaoImporta:
      "Transferência não pode ser importada. Registre pela tela de Caixinhas, que grava o movimento e o extrato juntos.",
    valorZerado: "Valor zerado",
    semSocio: (tipo: "APORTE" | "DISTRIBUICAO") =>
      `${tipo === "APORTE" ? "Aporte" : "Distribuição"} sem a coluna "socio" preenchida`,
    semDescricao: "(sem descrição)",
    modeloExemploDescReceita: "NF 042 - Sprint de agosto",
    modeloExemploDescDespesa: "Google Workspace",
    modeloExemploDescBolso: "Claude Pro",
    modeloExemploDescDist: "Distribuicao de lucros",
    modeloExemploSocio: "Nome do Sócio",
    modeloExemploObsBolso: "pago do proprio bolso",
  },

  // -----------------------------------------------------------------------
  simples: {
    faixasNaoCadastradas: (anexo: string) =>
      `Faixas do Anexo ${anexo} não cadastradas. Rode "npm run db:seed".`,
    rbt12AcimaTeto:
      "RBT12 acima do teto do Simples. A empresa provavelmente foi desenquadrada — a alíquota abaixo é só uma extrapolação da última faixa. Fale com o contador.",
  },

  // -----------------------------------------------------------------------
  email: {
    lang: "pt-BR",
    assunto: "Seu acesso ao FinanceOps",
    titulo: "Entrar no FinanceOps",
    corpo: (minutos: number) =>
      `Clique no botão abaixo para acessar. O link vale por <strong>${minutos} minutos</strong> e funciona uma única vez.`,
    botao: "Acessar o FinanceOps",
    seNaoFuncionar: "Se o botão não funcionar, copie este endereço:",
    rodape: (host: string) =>
      `Se você não pediu este acesso, ignore este e-mail — ninguém entra sem clicar no link. Enviado por ${host}.`,
    textoLink: (minutos: number) => `Acesse por este link (vale ${minutos} minutos, uso único):`,
    textoRodape: "Se você não pediu este acesso, ignore este e-mail.",
  },

  // -----------------------------------------------------------------------
  errors: {
    sessaoExpirada: "Sessão expirada ou acesso revogado. Entre novamente.",
    valorMaiorQueZero: "Informe um valor maior que zero.",
    impostoNegativo: "Imposto não pode ser negativo.",
    impostoMaiorQueBruto: "O imposto não pode ser maior que o valor bruto da receita.",
    selecioneSocio: "Selecione o sócio.",
    receitaComImpostoPago:
      "Esta receita tem imposto já pago. Estorne a guia em /impostos antes de excluir.",
    valorInvalido: "Valor inválido.",

    deNomeCaixinha: "Dê um nome à caixinha.",
    caixinhaJaExiste: (nome: string) => `Já existe uma caixinha chamada "${nome}".`,
    resgateAntesDeArquivar:
      "Resgate todo o dinheiro antes de arquivar — caixinha arquivada com saldo some do painel e o dinheiro fica invisível.",
    resgateAntesDeExcluir: "Resgate todo o dinheiro antes de excluir.",
    caixinhaComHistorico:
      "Esta caixinha tem histórico. Arquive em vez de excluir — apagar removeria as transferências do extrato e mudaria o saldo em conta retroativamente.",
    caixinhaNaoEncontrada: "Caixinha não encontrada.",
    movimentoNaoEncontrado: "Movimento não encontrado.",
    depositoSaldoNegativo:
      "Excluir este depósito deixaria a caixinha com saldo negativo. Desfaça os resgates posteriores primeiro.",

    selecioneArquivoCsv: "Selecione um arquivo CSV.",
    arquivoPrecisaColunas: (colunas: string) =>
      `O arquivo precisa ter ao menos as colunas "data" e "valor". Colunas encontradas: ${colunas}.`,
    socioNaoCadastrado: (socio: string) =>
      `Sócio "${socio}" não cadastrado. Adicione em Configurações → Sócios.`,
    nenhumaLinhaValida: "Nenhuma linha válida para importar.",

    informeNomeSocio: "Informe o nome do sócio.",
    informeNomeCliente: "Informe o nome do cliente.",
    emailJaNoSocio: (email: string, nome: string) => `O e-mail ${email} já está no sócio ${nome}.`,
    socioNaoEncontrado: "Sócio não encontrado.",
    emailInvalido: "E-mail inválido.",
    emailJaNoSocioUnico: (email: string, nome: string) =>
      `O e-mail ${email} já está no sócio ${nome}. Cada endereço pertence a uma pessoa só.`,
    clienteJaCadastrado: (nome: string) => `O cliente "${nome}" já está cadastrado.`,
    categoriaImpostoNaoExclui: "A categoria de impostos não pode ser excluída.",

    selecioneUmaGuia: "Selecione ao menos uma guia.",
    nenhumaGuiaProvisionada: "Nenhuma guia provisionada encontrada.",

    selecioneBackupJson: "Selecione o arquivo de backup (.json).",
    arquivoNaoJson:
      "Arquivo não é um JSON válido. Confira se baixou o backup completo, e não o CSV.",
    backupInconsistente: (problemas: string) => `Backup inconsistente: ${problemas}`,

    smtpNaoConfigurado:
      "SMTP não configurado. Defina SMTP_HOST, SMTP_USER, SMTP_PASS e EMAIL_FROM.",
    servidorEmailRecusou: (recusados: string) => `O servidor de e-mail recusou: ${recusados}`,
    naoConsegueEnviarEmail: "Não consegui enviar o e-mail. Avise quem administra o servidor.",

    // caixa.ts
    saldoContaInsuficiente: (disp: string, tentou: string) =>
      `Saldo em conta insuficiente: há ${disp} disponível e você tentou guardar ${tentou}.`,
    caixinhaSemSaldoResgate: (tem: string, tentou: string) =>
      `A caixinha tem ${tem}; não é possível resgatar ${tentou}.`,

    // api/v1
    corpoInvalidoJson: "Corpo inválido: esperado JSON.",
    campoTipoInvalido:
      "Campo 'tipo' deve ser ENTRADA, SAIDA, DISTRIBUICAO ou APORTE. Transferências entre conta e caixinha não são criadas por esta rota.",
    campoValorCentavos: "Campo 'valorCentavos' deve ser inteiro positivo (em centavos).",
    campoDescricaoObrigatorio: "Campo 'descricao' é obrigatório.",
    campoDataCompetencia: "Campo 'dataCompetencia' deve estar no formato YYYY-MM-DD.",
    referenciaExternaExiste: "Já existe lançamento com esta referenciaExterna.",
    falhaGravar: (msg: string) => `Falha ao gravar: ${msg}`,
    campoNomeObrigatorio: "Campo 'nome' é obrigatório.",
    naoAutorizadoBearer:
      "Não autorizado. Envie o header Authorization: Bearer <API_TOKEN>.",

    // acesso.ts (lib)
    emailValido: "Informe um e-mail válido.",
    seCadastradoChega: "Se este e-mail estiver cadastrado, o link de acesso chegará em instantes.",

    // sessao-cookie.ts
    authSecretAusente: "AUTH_SECRET ausente ou curto demais. Gere com: openssl rand -base64 32",
  },
};
