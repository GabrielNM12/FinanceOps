# Importação do extrato — 15/05 a 12/08 de 2026

Arquivo: `korvantis-extrato-2026-05-a-08.csv` — 22 lançamentos.

## Ordem de execução

Faça nesta ordem. O cálculo do imposto depende do histórico já estar no banco.

**1. Confira os sócios.** Os nomes no CSV precisam bater com os cadastrados em
Configurações → Sócios. O importador **não cria sócio automaticamente** — nome
digitado errado viraria um sétimo sócio silencioso e estragaria o rateio. Se um
nome não bater, a linha aparece em vermelho no preview.

**2. Importe o CSV.** Importar → selecione o arquivo → confira o preview →
**deixe "Provisionar DAS" marcado**. O cliente "Angeloni" é criado sozinho.

**3. Quite o DAS de julho.** Vá em Impostos: existe uma guia de **R$ 1.080,00**
provisionada sobre os R$ 18.000 do Angeloni. Selecione e registre o pagamento
com data **12/08/2026**. Isso cria a saída de caixa e fecha o vínculo com a
provisão.

**4. Crie a reserva do CDB.** Lançamentos → Reservar para o caixa →
**R$ 1.000,00**, motivo "Aplicação CDB Banco Inter". Ver a seção sobre o CDB
abaixo.

**5. Cadastre o Google Workspace como recorrente.** Recorrentes → novo →
R$ 245,00, categoria Ferramentas, início 01/08/2026. Ele não está no CSV de
propósito: o recorrente materializa os lançamentos sozinho e importar também
geraria duplicata.

Depois desses cinco passos, o saldo do app fica em **R$ 1.000,01**, com
R$ 1.000,00 reservados — ou seja, **R$ 0,01 de caixa livre, igual ao extrato do
Inter**.

---

## Conferência com o extrato

| | |
|---|---|
| Entradas + aportes | R$ 18.610,11 |
| Saídas + distribuições | R$ 16.530,10 |
| **Saldo no app após a importação** | **R$ 2.080,01** |
| − reserva do CDB (passo 4) | R$ 1.000,00 |
| − DAS de julho (passo 3) | R$ 1.080,00 |
| **= saldo final** | **R$ 0,01** ✓ |

O extrato do Inter fecha em R$ 0,01. Bate ao centavo.

Outras conferências: R$ 610,11 de aportes dos sócios, R$ 14.827,44 distribuídos
para 4 sócios, R$ 480,00 a reembolsar, R$ 5.400,00 a receber.

---

## Decisões tomadas na conversão

### GoHighLevel — aporte de entrada, despesa na saída

Os pix de R$ 75 / R$ 77,37 / R$ 78 que os sócios mandaram entram como **APORTE**:
é dinheiro entrando no caixa, mas não é faturamento — não pode gerar imposto nem
aparecer como receita.

Os repasses a Gabriel Muller (R$ 300 em junho, R$ 375 em julho) entram como
**despesa em Ferramentas**, porque é assim que o dinheiro do GoHighLevel sai da
empresa.

**Deixei esses dois repasses sem sócio vinculado de propósito.** Marcar Gabriel
Muller ali faria o painel dizer que ele adiantou R$ 675 do próprio bolso —
exatamente o contrário do que aconteceu.

Uma consequência a considerar: a empresa registrou R$ 675 de custo, mas você
disse que o GoHighLevel custa cerca de R$ 450/mês, ou seja ~R$ 900 em dois meses.
A diferença de ~R$ 225 foi absorvida pelo Gabriel Muller e nunca voltou. Não
inventei esse número porque quebraria a conciliação bancária — se quiser que
apareça, me diga o valor exato da fatura que eu incluo como despesa pendente com
o sócio vinculado, e ela entra em "a reembolsar".

### O CDB não é despesa

Os R$ 1.000 aplicados em CDB **não** entraram como saída. Aplicação não é gasto:
o dinheiro continua sendo de vocês, só mudou de lugar. Lançar como despesa
reduziria o lucro de julho em R$ 1.000 sem que nada tivesse sido gasto.

Por isso a reserva do passo 4. O resultado é que o app mostra **patrimônio total
R$ 1.000,01**, com R$ 1.000 reservados e R$ 0,01 livre — enquanto o extrato do
Inter mostra R$ 0,01 na conta corrente. As duas visões estão certas.

Se transferência entre contas próprias virar rotina, vale criar um tipo
`TRANSFERENCIA` no ledger. Hoje não existe.

### Os dois pagamentos à Receita Federal têm tratamentos diferentes

- **R$ 577,66 (29/07)** entrou como despesa na categoria Impostos. É de uma
  competência anterior ao extrato, não existe provisão para casar com ele.
- **R$ 1.080,00 (12/08)** **não** está no CSV. É exatamente 6,00% dos R$ 18.000
  do Angeloni — o app provisiona sozinho e você quita no passo 3. Assim a guia
  fica ligada à receita que a originou, e o relatório por competência funciona.

Aliás: esse 1.080 exato é uma boa confirmação de que vocês estão na 1ª faixa do
Anexo III, a 6,00%.

### Claude Code entra como adiantamento, não como pago

As quatro linhas de R$ 120 (Muller e Guilherme, julho e agosto) ficam com
**data de pagamento vazia** e o sócio vinculado. Elas contam como despesa da
empresa na competência, mas não como saída de caixa — porque de fato não saiu
nada da conta. Aparecem em "a pagar" e em "a reembolsar" no painel de sócios,
somando R$ 480,00.

Quando a empresa reembolsar, lance como Distribuição → natureza **Reembolso**.

### MESA DSL

Os R$ 5.400 do Angeloni entram como receita **sem data de recebimento** — a
competência ficou em 12/08/2026 porque você não informou a data de faturamento.
**Ajuste se a NF tiver outra data**, porque é ela que define em qual mês o
faturamento e o imposto aparecem.

---

## Dois pontos que valem atenção

**A alíquota do MESA DSL não vai ser 6%.** Vai ser ~6,87%, gerando R$ 370,98 de
provisão. O motivo: com apenas um mês de faturamento no sistema, a regra do
Simples manda proporcionalizar o RBT12 — R$ 18.000 × 12 = R$ 216.000, o que joga
a empresa para a 2ª faixa do Anexo III.

Se a Korvantis já fatura há mais de 12 meses, **essa alíquota está errada**, e o
motivo é que o histórico anterior a maio/2026 não está no sistema. Importe os
meses anteriores ou ajuste a provisão na mão em Impostos. Vale conferir com o
contador qual foi a alíquota real aplicada no DAS.

**O caixa livre vai ficar negativo em ~R$ 371.** Não é bug: vocês distribuíram
todo o lucro de julho, e os R$ 5.400 a receber já carregam imposto a pagar. É
justamente o alerta que o sistema existe para dar.

E vale registrar o que o extrato mostra sobre a disciplina de vocês: na
distribuição de 30/07 sobrou exatamente R$ 1.080,01 na conta — o valor do DAS
mais um centavo. Vocês já reservam o imposto antes de distribuir. O caixa livre
do dashboard só automatiza uma conta que vocês já fazem.

---

## O que ficou de fora e por quê

| Item | Motivo |
|---|---|
| Aplicação CDB R$ 1.000 | Vira reserva, não transação (passo 4) |
| DAS R$ 1.080 de 12/08 | O app provisiona; você quita em Impostos (passo 3) |
| Google Workspace | Vira recorrente (passo 5), senão duplicaria |
| Gabriel Hilamatu e Bruno na distribuição | Você confirmou que foi intencional |
