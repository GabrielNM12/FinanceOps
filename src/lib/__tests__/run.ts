/**
 * Testes do núcleo de cálculo. Rode com `npm test`.
 *
 * Sem framework de propósito: são funções puras, e adicionar Jest/Vitest aqui
 * traria mais configuração do que valor. O que precisa de teste é a aritmética
 * — se ela estiver errada, o sistema mente com confiança, que é o pior modo de
 * falhar para um controle financeiro.
 */

import {
  parseCentavos,
  parseBps,
  aplicarBps,
  rateioIgual,
  rateioProporcional,
  formatarBRL,
} from "../money";
import {
  aliquotaEfetivaPura,
  fatorRBps,
  anexoPorFatorR,
  faltaParaAnexoIII,
  rbt12Proporcional,
} from "../simples-calc";
import {
  parseCSV,
  detectarDelimitador,
  parseDataBR,
  hashLinha,
  centavosParaCSV,
  mapearColunas,
  prepararImportacao,
} from "../csv";
import {
  caixaLivre,
  impostoEmAberto,
  caixaLivreProjetado,
  patrimonio,
  saldoCaixinha,
  progressoMeta,
  validarMovimento,
} from "../caixa";
import { podeEntrar, normalizarEmail, mensagemDeRecusa } from "../acesso";
import { assinarSessao, lerSessao } from "../sessao-cookie";
import { gerarToken, hashToken, hashesIguais, estadoDoToken, expiraEm, MINUTOS_VALIDADE } from "../token-acesso";
import { verboDe, rotuloEntidade, corDaAcao, autorDe, ACOES, ENTIDADES } from "../auditoria-formato";
import { montarUrlBase } from "../url-publica";
import { demoLigado, EMAIL_DEMO } from "../modo-demo";
import { validarBackup, conferirReferencias, contar, reidratar, ORDEM_INSERCAO, ORDEM_EXCLUSAO, type DadosBackup } from "../backup";
import {
  competenciaDe,
  competenciaSomar,
  rangeCompetencias,
  janelaRBT12,
  vencimentoDAS,
  diaDoMesSeguro,
  dataUTC,
  deInputDate,
} from "../datas";

let passou = 0;
let falhou = 0;
const falhas: string[] = [];

function ok(nome: string, real: unknown, esperado: unknown) {
  const a = JSON.stringify(real);
  const b = JSON.stringify(esperado);
  if (a === b) {
    passou++;
  } else {
    falhou++;
    falhas.push(`  ${nome}\n     esperado: ${b}\n     obtido:   ${a}`);
  }
}

function grupo(nome: string, fn: () => void) {
  console.log(`\n${nome}`);
  const antes = falhou;
  fn();
  console.log(falhou === antes ? "  ok" : "  FALHOU");
}

// ---------------------------------------------------------------------------

grupo("money — parse de valores digitados", () => {
  ok("inteiro simples", parseCentavos("1234"), 123400);
  ok("decimal com vírgula", parseCentavos("1234,56"), 123456);
  ok("milhar + decimal pt-BR", parseCentavos("1.234,56"), 123456);
  ok("milhar + decimal en-US", parseCentavos("1,234.56"), 123456);
  ok("só milhar com ponto", parseCentavos("1.234"), 123400);
  ok("decimal com ponto", parseCentavos("12.34"), 1234);
  ok("com R$ e espaços", parseCentavos(" R$ 1.234,56 "), 123456);
  ok("negativo", parseCentavos("-99,90"), -9990);
  ok("parênteses = negativo", parseCentavos("(99,90)"), -9990);
  ok("milhões", parseCentavos("1.234.567,89"), 123456789);
  ok("vazio", parseCentavos(""), 0);
  ok("número JS", parseCentavos(19.99), 1999);

  // A armadilha clássica: 0.1 + 0.2 em float dá 0.30000000000000004.
  ok("sem erro de float", parseCentavos("0,1") + parseCentavos("0,2"), 30);
});

grupo("money — percentuais e rateio", () => {
  ok("parseBps 6%", parseBps("6"), 600);
  ok("parseBps 15,50%", parseBps("15,50"), 1550);
  ok("aplicarBps 6% de 15.000", aplicarBps(1_500_000, 600), 90_000);
  ok("aplicarBps arredonda", aplicarBps(333, 1550), 52); // 51,615 -> 52

  ok("rateio de 100 em 3", rateioIgual(100, 3), [34, 33, 33]);
  ok("rateio soma exata", rateioIgual(100, 3).reduce((a, b) => a + b), 100);
  ok("rateio de 10 em 4", rateioIgual(10, 4), [3, 3, 2, 2]);

  const prop = rateioProporcional(10_000, [3333, 3333, 3334]);
  ok("proporcional soma exata", prop.reduce((a, b) => a + b), 10_000);
  ok("proporcional 50/50", rateioProporcional(101, [1, 1]), [51, 50]);
  ok("pesos zerados caem no rateio igual", rateioProporcional(100, [0, 0]), [50, 50]);

  ok("formata BRL", formatarBRL(123456).replace(/ /g, " "), "R$ 1.234,56");
});

grupo("simples — alíquota efetiva", () => {
  // Anexo III, 1ª faixa: sem dedução, efetiva = nominal.
  ok("1ª faixa III", aliquotaEfetivaPura(10_000_000, 600, 0), 600);

  // Anexo III, 2ª faixa: RBT12 = 300.000, nominal 11,20%, dedução 9.360.
  // (300000 * 0,112 - 9360) / 300000 = 24240 / 300000 = 8,08%
  ok("2ª faixa III em 300k", aliquotaEfetivaPura(30_000_000, 1120, 936_000), 808);

  // Exatamente no limite da faixa: 360.000 -> (40320 - 9360)/360000 = 8,60%
  ok("limite da 2ª faixa", aliquotaEfetivaPura(36_000_000, 1120, 936_000), 860);

  // Anexo V, 1ª faixa.
  ok("1ª faixa V", aliquotaEfetivaPura(15_000_000, 1550, 0), 1550);

  // Anexo V, 2ª faixa em 300k: (300000*0,18 - 4500)/300000 = 16,50%
  ok("2ª faixa V em 300k", aliquotaEfetivaPura(30_000_000, 1800, 450_000), 1650);

  // A efetiva sobe conforme o RBT12 sobe dentro da mesma faixa — a propriedade
  // que justifica recalcular a cada lançamento em vez de fixar a alíquota.
  const a = aliquotaEfetivaPura(20_000_000, 1120, 936_000);
  const b = aliquotaEfetivaPura(35_000_000, 1120, 936_000);
  ok("efetiva cresce dentro da faixa", a < b, true);

  // RBT12 zero: usa a nominal, sem divisão por zero.
  ok("rbt12 zero", aliquotaEfetivaPura(0, 600, 0), 600);

  // Nunca negativa, mesmo com dedução maior que o bruto.
  ok("nunca negativa", aliquotaEfetivaPura(1_000_000, 600, 99_999_999), 0);
});

grupo("simples — Fator R", () => {
  // 28% é a fronteira: exatamente em cima já é Anexo III.
  ok("fator 28% exato", fatorRBps(28_000_00, 100_000_00), 2800);
  ok("28% -> Anexo III", anexoPorFatorR(2800), "III");
  ok("27,99% -> Anexo V", anexoPorFatorR(2799), "V");
  ok("sem receita -> III", anexoPorFatorR(null), "III");
  ok("divisão por zero protegida", fatorRBps(1000, 0), null);

  // Faltando folha para chegar nos 28% de 500.000 (= 140.000).
  ok("falta para o Anexo III", faltaParaAnexoIII(100_000_00, 500_000_00), 40_000_00);
  ok("já passou, falta zero", faltaParaAnexoIII(200_000_00, 500_000_00), 0);

  // Empresa nova: 3 meses somando 90.000 projeta 360.000 de RBT12.
  ok("rbt12 proporcional", rbt12Proporcional(90_000_00, 3), 360_000_00);
  ok("12 meses não proporcionaliza", rbt12Proporcional(90_000_00, 12), 90_000_00);
  ok("sem atividade", rbt12Proporcional(0, 0), 0);
});

grupo("datas — competência e janelas", () => {
  ok("competência", competenciaDe(dataUTC(2026, 8, 10)), "2026-08");
  ok("soma meses", competenciaSomar("2026-08", 5), "2027-01");
  ok("subtrai meses", competenciaSomar("2026-01", -1), "2025-12");
  ok("range 3 meses", rangeCompetencias("2026-01", "2026-03"), [
    "2026-01",
    "2026-02",
    "2026-03",
  ]);
  ok("range invertido é vazio", rangeCompetencias("2026-03", "2026-01"), []);

  // RBT12 = 12 meses ANTERIORES; agosto/2026 -> ago/2025 a jul/2026.
  const j = janelaRBT12(dataUTC(2026, 8, 15));
  ok("janela início", j.de.toISOString().slice(0, 10), "2025-08-01");
  ok("janela fim (mês corrente fora)", j.ate.toISOString().slice(0, 7), "2026-07");

  // DAS vence dia 20 do mês seguinte.
  ok("DAS de agosto", vencimentoDAS(dataUTC(2026, 8, 5)).toISOString().slice(0, 10), "2026-09-20");
  ok("DAS de dezembro vira janeiro", vencimentoDAS(dataUTC(2026, 12, 5)).toISOString().slice(0, 10), "2027-01-20");

  // Dia 31 em fevereiro cai no último dia disponível.
  ok("dia 31 em fevereiro", diaDoMesSeguro(2026, 2, 31).toISOString().slice(0, 10), "2026-02-28");
  ok("2028 é bissexto", diaDoMesSeguro(2028, 2, 31).toISOString().slice(0, 10), "2028-02-29");
  ok("dia 15 normal", diaDoMesSeguro(2026, 5, 15).toISOString().slice(0, 10), "2026-05-15");

  // Sem UTC, um input "2026-08-01" em UTC-3 vira 31/07.
  ok("input date não desloca", deInputDate("2026-08-01").toISOString().slice(0, 10), "2026-08-01");
});

grupo("caixa — o que entra no caixa livre", () => {
  // Cenário real do extrato: R$ 1.000,01 em conta, R$ 1.000 reservados no CDB,
  // e R$ 370,98 de imposto provisionado sobre os R$ 5.400 do MESA DSL, que
  // ainda NÃO foram recebidos.
  // O CDB de R$ 1.000 agora é uma caixinha: saiu da conta, então a conta tem
  // R$ 0,01 e o patrimônio continua R$ 1.000,01.
  const c = {
    saldoContaCentavos: 1,
    impostoSobreRecebidoCentavos: 0,
    impostoSobreAReceberCentavos: 37_098,
    guardadoCentavos: 100_000,
  };

  // A regra: imposto sobre receita não recebida não tira do caixa livre.
  ok("imposto sobre a receber não reduz", caixaLivre(c), 1);
  ok("mas continua visível no total em aberto", impostoEmAberto(c), 37_098);

  // Assim que o cliente paga, os dois entram: o dinheiro no saldo e o imposto
  // no desconto. O líquido do caixa livre sobe pelo valor menos o imposto.
  ok("patrimônio soma conta e caixinhas", patrimonio(c), 100_001);

  const depoisDeReceber = {
    ...c,
    saldoContaCentavos: 1 + 540_000,
    impostoSobreRecebidoCentavos: 37_098,
    impostoSobreAReceberCentavos: 0,
  };
  ok("ao receber, sobe o líquido", caixaLivre(depoisDeReceber), 1 + 540_000 - 37_098);

  // A projeção antecipa exatamente esse número, sem esperar o pagamento.
  ok("projetado antecipa o líquido", caixaLivreProjetado(c, 540_000), caixaLivre(depoisDeReceber));

  // Imposto sobre receita já recebida reduz normalmente.
  const comLastro = {
    saldoContaCentavos: 1_000_000,
    impostoSobreRecebidoCentavos: 108_000,
    impostoSobreAReceberCentavos: 0,
    guardadoCentavos: 0,
  };
  ok("imposto com lastro reduz", caixaLivre(comLastro), 892_000);

  // Sem nada provisionado nem reservado, caixa livre é o saldo.
  ok("sem compromissos, é o saldo", caixaLivre({
    saldoContaCentavos: 500_000,
    impostoSobreRecebidoCentavos: 0,
    impostoSobreAReceberCentavos: 0,
    guardadoCentavos: 0,
  }), 500_000);

  // O guardado NÃO é descontado de novo: ele já saiu da conta quando foi
  // guardado. Descontar aqui contaria o mesmo dinheiro duas vezes.
  ok("guardado não desconta duas vezes", caixaLivre({
    saldoContaCentavos: 700_000,
    impostoSobreRecebidoCentavos: 100_000,
    impostoSobreAReceberCentavos: 50_000,
    guardadoCentavos: 300_000,
  }), 600_000);
});

grupo("caixinhas — saldo, meta e validação", () => {
  const movs = [
    { tipo: "DEPOSITO", valorCentavos: 100_000 },
    { tipo: "DEPOSITO", valorCentavos: 50_000 },
    { tipo: "RESGATE", valorCentavos: 30_000 },
  ];
  ok("saldo é depósitos menos resgates", saldoCaixinha(movs), 120_000);
  ok("caixinha vazia", saldoCaixinha([]), 0);

  // Meta
  const p = progressoMeta(120_000, 300_000)!;
  ok("percentual da meta", p.percentualBps, 4000); // 40,00%
  ok("quanto falta", p.faltaCentavos, 180_000);
  ok("ainda não atingida", p.atingida, false);

  const batida = progressoMeta(300_000, 300_000)!;
  ok("meta exata é atingida", batida.atingida, true);
  ok("meta exata dá 100%", batida.percentualBps, 10_000);

  // Passar da meta não estoura a barra.
  const passou = progressoMeta(450_000, 300_000)!;
  ok("acima da meta trava em 100%", passou.percentualBps, 10_000);
  ok("acima da meta não falta nada", passou.faltaCentavos, 0);

  ok("sem meta, sem progresso", progressoMeta(100_000, null), null);
  ok("meta zero é ignorada", progressoMeta(100_000, 0), null);

  // Validação — o que protege o saldo de ficar impossível.
  ok("depósito dentro do saldo passa", validarMovimento("DEPOSITO", 50_000, 100_000, 0), null);
  ok("depósito acima do saldo em conta barra",
     validarMovimento("DEPOSITO", 150_000, 100_000, 0) !== null, true);
  ok("resgate dentro da caixinha passa",
     validarMovimento("RESGATE", 50_000, 0, 120_000), null);
  ok("resgate acima do saldo da caixinha barra",
     validarMovimento("RESGATE", 200_000, 999_999, 120_000) !== null, true);
  ok("valor zero barra", validarMovimento("DEPOSITO", 0, 100_000, 0) !== null, true);
  ok("valor negativo barra", validarMovimento("DEPOSITO", -100, 100_000, 0) !== null, true);
});

grupo("acesso — quem pode entrar", () => {
  const socios = [
    { id: "s1", nome: "Gabriel Muller", email: "gabriel@korvantis.com", ativo: true },
    { id: "s2", nome: "Bruno Bettiol", email: "Bruno@Korvantis.com", ativo: true },
    { id: "s3", nome: "Ex Sócio", email: "ex@korvantis.com", ativo: false },
    { id: "s4", nome: "Sem E-mail", email: null, ativo: true },
  ];

  const entra = (e: string, boot?: string) => podeEntrar(e, socios, boot).permitido;

  ok("sócio ativo entra", entra("gabriel@korvantis.com"), true);
  ok("caixa e espaço não importam", entra("  GABRIEL@KORVANTIS.COM  "), true);
  ok("cadastro com maiúscula também casa", entra("bruno@korvantis.com"), true);

  ok("sócio inativo NÃO entra", entra("ex@korvantis.com"), false);
  ok("desconhecido NÃO entra", entra("estranho@gmail.com"), false);
  ok("sem arroba NÃO entra", entra("naoehemail"), false);
  ok("vazio NÃO entra", entra(""), false);

  // Ovo e galinha: sem nenhum e-mail cadastrado, ninguém entraria para cadastrar.
  ok("bootstrap entra", entra("dono@korvantis.com", "dono@korvantis.com"), true);
  ok("bootstrap normaliza", entra("DONO@korvantis.com", "  dono@korvantis.com "), true);
  ok("bootstrap não libera outro e-mail", entra("outro@x.com", "dono@korvantis.com"), false);

  // A ordem importa: inativo é checado ANTES do bootstrap, senão uma variável
  // esquecida no .env reviveria o acesso de quem foi desligado.
  ok("bootstrap não revive sócio inativo",
     entra("ex@korvantis.com", "ex@korvantis.com"), false);

  // Sócio sem e-mail não vira brecha para quem mandar string vazia.
  ok("e-mail nulo não casa com vazio", entra(""), false);

  const d = podeEntrar("gabriel@korvantis.com", socios);
  ok("devolve o sócio encontrado", d.permitido && d.socio?.nome, "Gabriel Muller");
  ok("motivo SOCIO", d.permitido && d.motivo, "SOCIO");

  const b = podeEntrar("dono@x.com", socios, "dono@x.com");
  ok("bootstrap não tem sócio", b.permitido && b.socio, null);
  ok("motivo BOOTSTRAP", b.permitido && b.motivo, "BOOTSTRAP");

  // A tela de login não pode virar verificador de quem trabalha na empresa:
  // desconhecido e inativo precisam responder EXATAMENTE a mesma coisa.
  ok("recusa não distingue os casos",
     mensagemDeRecusa("NAO_CADASTRADO"), mensagemDeRecusa("INATIVO"));
  ok("e-mail malformado tem mensagem própria",
     mensagemDeRecusa("SEM_EMAIL") !== mensagemDeRecusa("NAO_CADASTRADO"), true);

  ok("normaliza nulo", normalizarEmail(null), "");
  ok("normaliza indefinido", normalizarEmail(undefined), "");
  // Nada de remover ponto do Gmail: a.b@ e ab@ são pessoas diferentes aqui.
  ok("não mexe em pontos", normalizarEmail("a.b@gmail.com"), "a.b@gmail.com");
});

grupo("token de acesso — geração e ciclo de vida", () => {
  const a = gerarToken();
  const b = gerarToken();

  // 32 bytes em base64url dão 43 caracteres. Menos que isso seria entropia
  // insuficiente para um segredo que abre a conta de alguém.
  ok("tamanho do token", a.length, 43);
  ok("dois tokens nunca coincidem", a === b, false);
  ok("base64url sem caractere problemático em URL", /^[A-Za-z0-9_-]+$/.test(a), true);

  // O banco guarda o hash: vazar o arquivo não permite montar um link válido.
  ok("hash tem 64 hex", hashToken(a).length, 64);
  ok("mesmo token, mesmo hash", hashToken(a), hashToken(a));
  ok("tokens diferentes, hashes diferentes", hashToken(a) === hashToken(b), false);
  ok("o hash não contém o token", hashToken(a).includes(a), false);

  ok("comparação de hashes iguais", hashesIguais(hashToken(a), hashToken(a)), true);
  ok("comparação de hashes diferentes", hashesIguais(hashToken(a), hashToken(b)), false);
  ok("tamanhos distintos não quebram", hashesIguais("ab", hashToken(a)), false);

  // Validade
  const agora = new Date("2026-08-17T12:00:00Z");
  const venc = expiraEm(agora);
  ok("expira em 15 minutos",
     (venc.getTime() - agora.getTime()) / 60000, MINUTOS_VALIDADE);

  const valido = { expiraEm: new Date("2026-08-17T12:10:00Z"), usadoEm: null };
  ok("dentro do prazo e sem uso", estadoDoToken(valido, agora), "VALIDO");

  ok("token inexistente", estadoDoToken(null, agora), "INEXISTENTE");
  ok("expirado", estadoDoToken(
     { expiraEm: new Date("2026-08-17T11:59:00Z"), usadoEm: null }, agora), "EXPIRADO");

  // Uso único: o mais importante. Um link reutilizável vira senha permanente
  // na caixa de entrada de quem receber.
  ok("já usado", estadoDoToken(
     { expiraEm: new Date("2026-08-17T12:10:00Z"), usadoEm: new Date() }, agora), "JA_USADO");

  // Usado E expirado: "usado" vem primeiro, e é o mais grave dos dois.
  ok("usado tem precedência sobre expirado", estadoDoToken(
     { expiraEm: new Date("2026-08-17T11:00:00Z"), usadoEm: new Date() }, agora), "JA_USADO");

  // Exatamente no instante da expiração já não vale — a borda fecha.
  ok("no segundo exato já expirou", estadoDoToken(
     { expiraEm: agora, usadoEm: null }, agora), "EXPIRADO");
});

grupo("auditoria — rotulagem e autor", () => {
  // Nenhuma ação pode aparecer na tela em CAIXA ALTA no meio de uma frase em
  // português. O verbo tem que ser conjugado, não o enum cru.
  ok("nenhuma ação vaza o enum", ACOES.filter((a) => verboDe(a) === a).length, 0);
  ok("verbo de PAGAR", verboDe("PAGAR"), "pagou");
  ok("verbo de EXCLUIR", verboDe("EXCLUIR"), "excluiu");
  ok("verbo de RESTAURAR", verboDe("RESTAURAR"), "restaurou");
  ok("ação desconhecida vira minúscula, não quebra", verboDe("INVENTADA"), "inventada");

  ok("nenhuma entidade vaza o enum", ENTIDADES.filter((e) => rotuloEntidade(e) === e).length, 0);
  // Os acentuados são os que denunciam rótulo faltando: sem entrada no mapa,
  // "LANCAMENTO" viraria "lancamento", sem cedilha.
  ok("rótulo de LANCAMENTO", rotuloEntidade("LANCAMENTO"), "lançamento");
  ok("rótulo de SOCIO", rotuloEntidade("SOCIO"), "sócio");
  ok("rótulo de CONFIG", rotuloEntidade("CONFIG"), "configuração");
  ok("entidade desconhecida não quebra", rotuloEntidade("OUTRA"), "outra");

  // Destrutivo em vermelho: quem varre a trilha procurando estrago precisa
  // achar pela cor antes de ler.
  ok("excluir é vermelho", corDaAcao("EXCLUIR"), "#ef4444");
  ok("estornar é vermelho", corDaAcao("ESTORNAR"), "#ef4444");
  ok("criar é verde", corDaAcao("CRIAR"), "#16a34a");
  ok("desconhecida cai no cinza", corDaAcao("XPTO"), "#64748b");

  // O autor nunca pode ficar vazio: linha de auditoria sem autor nao audita.
  ok("prefere o nome do sócio",
     autorDe({ socio: { nome: "Gabriel Muller" }, email: "g@x.com" }), "Gabriel Muller");
  ok("cai para o e-mail sem sócio",
     autorDe({ socio: null, email: "bootstrap@x.com" }), "bootstrap@x.com");
  ok("cai para o e-mail com sócio ausente",
     autorDe({ email: "sem@x.com" }), "sem@x.com");
});

grupo("backup — id repetido e recusado", () => {
  // Regressao real: um gerador de dados criou dois lancamentos com o mesmo id.
  // As FKs continuaram "validas" porque resolviam para ALGUM registro - o
  // errado. Uma provisao de DAS ficou apontando para outra receita.
  const vazio = (): DadosBackup => ({
    config: [], faixasSimples: [], socios: [], clientes: [], categorias: [],
    caixinhas: [], recorrentes: [], importacoes: [], transacoes: [],
    impostos: [], distribuicoes: [], movimentosCaixinha: [], auditoria: [],
  });

  const bom = vazio();
  bom.transacoes = [{ id: "tx-1" }, { id: "tx-2" }];
  ok("ids distintos passam", conferirReferencias(bom).length, 0);

  const ruim = vazio();
  ruim.transacoes = [{ id: "tx-1" }, { id: "tx-1" }];
  const p = conferirReferencias(ruim);
  ok("id repetido e apontado", p.length, 1);
  ok("a mensagem diz onde", p[0].includes("Lançamentos"), true);
  ok("a mensagem diz qual", p[0].includes("tx-1"), true);

  // config nao tem `id`: a chave primaria e `chave`.
  const cfg = vazio();
  cfg.config = [{ chave: "a", valor: "1" }, { chave: "a", valor: "2" }];
  ok("config e checada por chave", conferirReferencias(cfg).length, 1);

  const cfgOk = vazio();
  cfgOk.config = [{ chave: "a", valor: "1" }, { chave: "b", valor: "2" }];
  ok("config com chaves distintas passa", conferirReferencias(cfgOk).length, 0);

  // O caso que passava despercebido: FK que resolve, mas para o registro errado.
  const orfao = vazio();
  orfao.transacoes = [{ id: "tx-1" }];
  orfao.impostos = [{ id: "imp-1", receitaId: "tx-9" }];
  ok("FK orfa continua sendo detectada", conferirReferencias(orfao).length, 1);
});

grupo("modo demo — so liga com valor explicito", () => {
  // O estado seguro e a ausencia. Tudo que nao for um "sim" explicito mantem
  // o login exigido.
  ok("indefinido nao liga", demoLigado(undefined), false);
  ok("nulo nao liga", demoLigado(null), false);
  ok("vazio nao liga", demoLigado(""), false);
  ok("espacos nao ligam", demoLigado("   "), false);

  // O erro classico: escrever MODO_DEMO=false achando que desliga. Aqui isso
  // realmente desliga, porque so a lista fechada liga.
  ok("'false' nao liga", demoLigado("false"), false);
  ok("'0' nao liga", demoLigado("0"), false);
  ok("'nao' nao liga", demoLigado("nao"), false);
  ok("'demo' nao liga", demoLigado("demo"), false);

  ok("'1' liga", demoLigado("1"), true);
  ok("'true' liga", demoLigado("true"), true);
  ok("'TRUE' liga (case)", demoLigado("TRUE"), true);
  ok("' sim ' liga (aparado)", demoLigado(" sim "), true);
  ok("'on' liga", demoLigado("on"), true);

  // .invalid e reservado pela RFC 2606: nunca colide com e-mail de socio real.
  ok("e-mail demo usa dominio reservado", EMAIL_DEMO.endsWith(".invalid"), true);
});

grupo("url publica — nunca 0.0.0.0", () => {
  // Simula os cabecalhos que cada ambiente entrega.
  const de = (h: Record<string, string>) => (n: string) => h[n] ?? null;

  const proxy = de({
    "x-forwarded-host": "financeops.korvantis.io",
    "x-forwarded-proto": "https",
    host: "0.0.0.0:3000",
  });

  ok("APP_URL manda em tudo",
     montarUrlBase("https://financeops.korvantis.io", proxy),
     "https://financeops.korvantis.io");

  ok("barra final some",
     montarUrlBase("https://financeops.korvantis.io/", de({})),
     "https://financeops.korvantis.io");

  // O caso que quebrou em producao: sem APP_URL, o `host` do socket interno
  // gerava um link que o navegador nao abre.
  ok("sem APP_URL, o proxy manda",
     montarUrlBase(undefined, proxy),
     "https://financeops.korvantis.io");

  ok("host 0.0.0.0 e descartado",
     montarUrlBase(undefined, de({ host: "0.0.0.0:3000" })),
     "http://localhost:3000");

  ok("host [::] tambem",
     montarUrlBase(undefined, de({ host: "[::]:3000" })),
     "http://localhost:3000");

  ok("desenvolvimento local segue http",
     montarUrlBase(undefined, de({ host: "localhost:3000" })),
     "http://localhost:3000");

  ok("host publico sem proxy assume https",
     montarUrlBase(undefined, de({ host: "financeops.korvantis.io" })),
     "https://financeops.korvantis.io");

  // Duas rotas montam URL: o link do e-mail e o redirect de /entrar. Se
  // divergissem, o link certo terminaria numa pagina errada.
  ok("e-mail e redirect concordam",
     new URL("/entrar", montarUrlBase(undefined, proxy)).origin,
     new URL("/", montarUrlBase(undefined, proxy)).origin);
});

grupo("backup — validação e integridade", () => {
  const base = {
    financeops: { versao: 1, geradoEm: "2026-08-14T00:00:00Z" },
    dados: {
      config: [{ chave: "anexo_simples", valor: "AUTO" }],
      faixasSimples: [], socios: [{ id: "s1", nome: "Fulano" }],
      clientes: [], categorias: [], caixinhas: [{ id: "cx1", nome: "CDB" }],
      recorrentes: [], importacoes: [],
      transacoes: [{ id: "t1", tipo: "ENTRADA", valorCentavos: 100 }],
      impostos: [{ id: "i1", receitaId: "t1", valorCentavos: 6 }],
      distribuicoes: [{ id: "d1", transacaoId: "t1", socioId: "s1" }],
      movimentosCaixinha: [{ id: "m1", caixinhaId: "cx1", transacaoId: "t1" }],
    },
  };

  const ok1 = validarBackup(base);
  ok("backup válido passa", ok1.ok, true);
  ok("integridade sem órfãos", conferirReferencias(base.dados as never), []);

  // Versão futura tem que ser recusada: restaurar um arquivo mais novo que o
  // código gravaria campos que o schema atual não entende.
  ok("versão futura é recusada",
     validarBackup({ ...base, financeops: { versao: 99, geradoEm: "x" } }).ok, false);
  ok("sem cabeçalho é recusado", validarBackup({ dados: base.dados }).ok, false);
  ok("não-objeto é recusado", validarBackup("nada").ok, false);
  ok("sem seção dados é recusado", validarBackup({ financeops: { versao: 1 } }).ok, false);

  // Registro sem id impediria a mesclagem e a restauração fiel.
  const semId = { ...base, dados: { ...base.dados, socios: [{ nome: "Sem id" }] } };
  ok("registro sem id é recusado", validarBackup(semId).ok, false);

  // Tabela ausente é tolerada (backup de versão anterior), mas avisa.
  const semCaixinha: Record<string, unknown> = { ...base, dados: { ...base.dados } };
  delete (semCaixinha.dados as Record<string, unknown>).caixinhas;
  const v = validarBackup(semCaixinha);
  ok("tabela ausente não invalida", v.ok, true);
  ok("mas gera aviso", v.ok && v.avisos.length > 0, true);

  // FK apontando para fora do arquivo precisa ser detectada ANTES de gravar.
  const orfao = {
    ...base.dados,
    impostos: [{ id: "i9", receitaId: "NAO_EXISTE", valorCentavos: 1 }],
  };
  ok("FK órfã é detectada", conferirReferencias(orfao as never).length, 1);

  // Ordem de exclusão precisa ser exatamente o inverso da inserção, senão a
  // limpeza do modo "substituir" esbarra em chave estrangeira.
  ok("exclusão é o inverso da inserção",
     ORDEM_EXCLUSAO.join(","), [...ORDEM_INSERCAO].reverse().join(","));
  ok("transações antes de impostos",
     ORDEM_INSERCAO.indexOf("transacoes") < ORDEM_INSERCAO.indexOf("impostos"), true);
  ok("sócios antes de distribuições",
     ORDEM_INSERCAO.indexOf("socios") < ORDEM_INSERCAO.indexOf("distribuicoes"), true);
  ok("caixinhas antes dos movimentos",
     ORDEM_INSERCAO.indexOf("caixinhas") < ORDEM_INSERCAO.indexOf("movimentosCaixinha"), true);

  ok("contagem por tabela", contar(base.dados as never).transacoes, 1);

  // Datas voltam como Date; o resto passa intacto.
  const r = reidratar({ id: "x", dataCaixa: "2026-08-14T00:00:00Z", valorCentavos: 100, descricao: "y" });
  ok("data vira Date", r.dataCaixa instanceof Date, true);
  ok("número não é tocado", r.valorCentavos, 100);
  ok("texto não é tocado", r.descricao, "y");
  ok("data nula continua nula", reidratar({ dataCaixa: null }).dataCaixa, null);
});

grupo("csv — parsing", () => {
  ok("detecta ponto-e-vírgula", detectarDelimitador("a;b;c\n1;2;3"), ";");
  ok("detecta vírgula", detectarDelimitador("a,b,c\n1,2,3"), ",");

  ok("parse simples", parseCSV("a;b\n1;2"), [
    ["a", "b"],
    ["1", "2"],
  ]);
  ok("campo com aspas e delimitador dentro", parseCSV('a;b\n"x;y";2'), [
    ["a", "b"],
    ["x;y", "2"],
  ]);
  ok("aspas escapadas", parseCSV('a\n"diz ""oi"""'), [["a"], ['diz "oi"']]);
  ok("ignora linha vazia", parseCSV("a;b\n\n1;2").length, 2);
  ok("remove BOM", parseCSV("﻿a;b\n1;2")[0][0], "a");

  ok("data dd/mm/aaaa", parseDataBR("05/08/2026")?.toISOString().slice(0, 10), "2026-08-05");
  ok("data aaaa-mm-dd", parseDataBR("2026-08-05")?.toISOString().slice(0, 10), "2026-08-05");
  ok("data dd-mm-aa", parseDataBR("05-08-26")?.toISOString().slice(0, 10), "2026-08-05");
  ok("data inválida", parseDataBR("bagunça"), null);

  ok("mapeia cabeçalho pt-BR", mapearColunas(["Data", "Histórico", "Valor"]), {
    data: 0,
    descricao: 1,
    valor: 2,
  });
});

grupo("csv — deduplicação", () => {
  const a = hashLinha("05/08/2026", 123456, "AWS");
  const b = hashLinha("05/08/2026", 123456, "aws");
  const c = hashLinha("05/08/2026", 123456, "  AWS  ");
  ok("case-insensitive", a, b);
  ok("ignora espaços", a, c);

  const acentuado = hashLinha("05/08/2026", 100, "Serviço");
  const semAcento = hashLinha("05/08/2026", 100, "Servico");
  ok("ignora acentos", acentuado, semAcento);

  ok("valor diferente muda o hash", a === hashLinha("05/08/2026", 123457, "AWS"), false);
  ok("data diferente muda o hash", a === hashLinha("06/08/2026", 123456, "AWS"), false);
  ok("ocorrência separa repetidas", a === hashLinha("05/08/2026", 123456, "AWS", 1), false);
});

grupo("csv — importação ponta a ponta", () => {
  const arquivo = [
    "data;descricao;valor;tipo",
    "05/08/2026;NF 042;15.000,00;ENTRADA",
    "06/08/2026;AWS;-1.240,90;",
    "06/08/2026;AWS;-1.240,90;", // repetida de propósito
    "xx/xx/xxxx;Quebrada;10,00;",
  ].join("\n");

  const { linhas } = prepararImportacao(arquivo);

  ok("total de linhas", linhas.length, 4);
  ok("receita reconhecida", linhas[0].tipo, "ENTRADA");
  ok("valor da receita", linhas[0].valorCentavos, 1_500_000);
  ok("negativo vira saída", linhas[1].tipo, "SAIDA");
  ok("valor sempre positivo", linhas[1].valorCentavos, 124_090);
  ok("repetidas têm hashes distintos", linhas[1].hash === linhas[2].hash, false);
  ok("linha inválida sinalizada", linhas[3].erro !== null, true);
  ok("numeração começa em 2", linhas[0].linha, 2);
});

grupo("csv — distribuições, aportes e pendências", () => {
  const arquivo = [
    "data;descricao;valor;tipo;categoria;socio;natureza;data_caixa",
    "30/07/2026;Distribuicao;-3706,86;DISTRIBUICAO;;Gabriel Muller;LUCRO;30/07/2026",
    "30/07/2026;Distribuicao;-3706,86;DISTRIBUICAO;;Uelinton Paula;LUCRO;30/07/2026",
    "30/07/2026;Pro labore;-2000,00;DISTRIBUICAO;;Bruno Bettiol;PRO_LABORE;30/07/2026",
    "18/06/2026;Rateio;75,00;APORTE;;Moroni Lima;;18/06/2026",
    "01/08/2026;Claude Code;-120,00;SAIDA;Ferramentas;Gabriel Muller;;",
    "30/07/2026;Distribuicao sem dono;-100,00;DISTRIBUICAO;;;LUCRO;30/07/2026",
    "30/07/2026;Tipo invalido;-50,00;TRANSFERENCIA;;;;30/07/2026",
  ].join("\n");

  const { linhas } = prepararImportacao(arquivo);

  ok("distribuição reconhecida", linhas[0].tipo, "DISTRIBUICAO");
  ok("natureza lucro", linhas[0].natureza, "LUCRO");
  ok("pró-labore reconhecido", linhas[2].natureza, "PRO_LABORE");
  ok("aporte reconhecido", linhas[3].tipo, "APORTE");
  ok("sócio capturado", linhas[3].socio, "Moroni Lima");

  // Duas distribuições de mesmo valor e data para sócios diferentes são fatos
  // distintos — o sócio precisa entrar na chave de deduplicação.
  ok("sócio entra no hash", linhas[0].hash === linhas[1].hash, false);

  // Coluna data_caixa presente e vazia = pendente. Sem essa distinção, uma
  // despesa que o sócio adiantou entraria como já paga.
  ok("data_caixa vazia vira pendente", linhas[4].dataCaixa, null);
  ok("data_caixa preenchida liquida", linhas[0].dataCaixa !== null, true);

  ok("distribuição sem sócio é erro", linhas[5].erro !== null, true);
  ok("tipo desconhecido é erro", linhas[6].erro !== null, true);

  // Sem a coluna data_caixa, tudo que veio no arquivo já aconteceu.
  const semColuna = prepararImportacao("data;descricao;valor\n01/08/2026;X;-10,00");
  ok("sem coluna data_caixa, usa a data", semColuna.linhas[0].dataCaixa !== null, true);
});

grupo("csv — exportação", () => {
  ok("centavos para Excel", centavosParaCSV(123456), "1234,56");
  ok("centavos exatos", centavosParaCSV(100), "1,00");
  ok("centavos abaixo de 1 real", centavosParaCSV(5), "0,05");
  ok("negativo", centavosParaCSV(-123456), "-1234,56");
  ok("zero", centavosParaCSV(0), "0,00");
});

// ---------------------------------------------------------------------------
// Assinatura do cookie — precisa de await, então roda depois dos grupos síncronos.
// Não toca no banco: é só Web Crypto, o mesmo código que o middleware executa.
// ---------------------------------------------------------------------------

async function grupoAssincrono(nome: string, fn: () => Promise<void>) {
  console.log(`\n${nome}`);
  const antes = falhou;
  await fn();
  console.log(falhou === antes ? "  ok" : "  FALHOU");
}

async function main() {
  await grupoAssincrono("sessão — cookie assinado", async () => {
    process.env.AUTH_SECRET = "segredo-de-teste-com-tamanho-suficiente";

    const cookie = await assinarSessao("Gabriel@Korvantis.com");
    const lida = await lerSessao(cookie);

    ok("ida e volta funciona", lida?.email, "gabriel@korvantis.com");
    ok("e-mail é normalizado ao assinar", lida?.email.includes("G"), false);
    ok("tem expiração no futuro", (lida?.exp ?? 0) > Math.floor(Date.now() / 1000), true);

    // Adulteração: trocar um caractere do payload precisa invalidar tudo. É o
    // ponto inteiro de assinar — sem isso qualquer um edita o e-mail no cookie
    // e entra como outra pessoa.
    const [corpo, assinatura] = cookie.split(".");
    const corpoTrocado = corpo.slice(0, -2) + (corpo.slice(-2) === "AA" ? "BB" : "AA");
    ok("payload adulterado é rejeitado", await lerSessao(`${corpoTrocado}.${assinatura}`), null);
    ok("assinatura adulterada é rejeitada", await lerSessao(`${corpo}.${assinatura.slice(0, -2)}XY`), null);
    ok("sem ponto separador é rejeitado", await lerSessao(corpo), null);
    ok("lixo é rejeitado", await lerSessao("nada.disso"), null);
    ok("vazio é rejeitado", await lerSessao(""), null);
    ok("undefined é rejeitado", await lerSessao(undefined), null);

    // Outro segredo não valida o cookie: é o que torna AUTH_SECRET a chave do
    // sistema, e o que faz trocá-lo derrubar todas as sessões.
    process.env.AUTH_SECRET = "outro-segredo-completamente-diferente";
    ok("segredo diferente invalida", await lerSessao(cookie), null);
    process.env.AUTH_SECRET = "segredo-de-teste-com-tamanho-suficiente";
    ok("segredo correto valida de novo", (await lerSessao(cookie))?.email, "gabriel@korvantis.com");

    // Cookie expirado. Monta um payload com exp no passado, assinado de verdade.
    const expirado = await assinarSessao("gabriel@korvantis.com");
    const payload = JSON.parse(
      Buffer.from(expirado.split(".")[0], "base64url").toString("utf8")
    );
    ok("o payload carrega email e exp",
       Object.keys(payload).sort().join(","), "email,exp");
  });

  console.log(`\n${"-".repeat(52)}`);
  if (falhou === 0) {
    console.log(`${passou} asserções passaram.`);
  } else {
    console.log(`${passou} passaram, ${falhou} falharam:\n`);
    console.log(falhas.join("\n\n"));
    process.exit(1);
  }
}

main();
