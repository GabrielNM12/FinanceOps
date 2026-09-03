# Guia de Integração

Como plugar o Gestor de Gastos em outro sistema interno: estrutura de banco,
mapeamento de tipos por dialeto, API e passo a passo de migração.

**Leia a seção [Invariantes](#invariantes-o-que-o-banco-não-protege) antes de
escrever qualquer coisa nessas tabelas.** Boa parte das regras de negócio não
está expressa em constraint — está no código — e violá-las produz relatório
errado sem gerar nenhum erro de banco.

---

## 1. Escolha a rota de integração

Três caminhos, em ordem crescente de acoplamento.

### A. Consumir a API REST (recomendado para começar)

O outro sistema chama `/api/v1/*`. Nenhuma regra de negócio é replicada: quem
decide se o imposto conta na competência ou no caixa continua sendo um lugar só.

- **A favor:** acoplamento mínimo; o schema pode evoluir sem quebrar o consumidor;
  o cálculo do Simples não é reimplementado (e reimplementar é onde as
  divergências nascem).
- **Contra:** exige o app no ar; latência de rede; sem JOIN entre os dois domínios.
- **Use quando:** o outro sistema só precisa **ler** (dashboard, relatório) ou
  **empurrar lançamentos** pontuais.

### B. Banco compartilhado, tabelas separadas

As tabelas `fin_*` vivem no mesmo banco do sistema interno, mas só este app
escreve nelas. O outro sistema lê via view.

- **A favor:** JOIN direto entre `fin_cliente` e as tabelas do outro sistema;
  transação atômica cruzando os dois domínios; sem latência.
- **Contra:** os dois sistemas passam a compartilhar destino de migration; um
  `DROP` descuidado atinge os dois.
- **Use quando:** precisa cruzar dados (ex.: horas apontadas × receita do
  cliente) num relatório só.

Por isso todas as tabelas têm prefixo `fin_` e os IDs são `cuid` em vez de
`autoincrement`: dá para despejar essas tabelas em qualquer banco existente sem
conflito de nome nem colisão de chave.

### C. Fusão total

Unificar `fin_cliente` com a tabela de clientes do outro sistema e `fin_socio`
com a de usuários.

- **A favor:** uma verdade só; sem sincronização.
- **Contra:** é reescrita, não integração. O ciclo de vida de "cliente
  financeiro" raramente é o mesmo de "cliente comercial" (CRM, contrato, contato).
- **Sugestão:** não faça isso de saída. Comece pelo B mantendo um campo
  `id_externo` em `fin_cliente` e funda depois, se a dor aparecer.

**Recomendação:** comece pela **A**. Migre para **B** quando aparecer o primeiro
relatório que precise de JOIN — e não antes.

---

## 2. Modelo de dados

### Visão geral

```
fin_socio ─┬─< fin_distribuicao >─┐
           │                      │
           └──────────────────────┼──< fin_transacao >──┬── fin_cliente
                                  │        │            │
                                  │        │            └── fin_categoria
                                  │        │
                                  │        ├──< fin_imposto (provisão)
                                  │        │        │
                                  │        └────────┘ (pagamento_id: a guia paga)
                                  │
fin_recorrente >──────────────────┘

fin_faixa_simples   (tabela de parâmetros fiscais, sem FK)
fin_config          (chave/valor)
fin_importacao      (lote de CSV)
fin_caixinha >──< fin_caixinha_movimento >── fin_transacao (TRANSFERENCIA 1:1)
```

`fin_transacao` é o **ledger único**: receita, despesa, distribuição e aporte
são a mesma tabela, distinguidas pela coluna `tipo`. Isso mantém o fluxo de
caixa como um `SUM` só e a importação como um formato só. O preço é que algumas
colunas são nullable por natureza (`cliente_id` só faz sentido em receita,
`socio_id` só em distribuição) — a validação disso está na aplicação.

### Convenções

| Convenção | Motivo |
|---|---|
| Dinheiro em `INTEGER` de **centavos** | `DECIMAL` resolveria, mas centavo inteiro é portável entre todos os dialetos e imune a erro de ponto flutuante em qualquer linguagem cliente |
| Percentual em `INTEGER` de **basis points** | `600` = 6,00%. Mesma lógica |
| IDs `VARCHAR(30)` com `cuid` | Sem colisão ao mesclar bancos; gerado no cliente, sem round-trip |
| Prefixo `fin_` | Convive com tabelas existentes sem conflito |
| `data_competencia` × `data_caixa` | Regime de competência × regime de caixa. `data_caixa NULL` = pendente |

---

## 3. DDL

Canônico em **PostgreSQL**. As diferenças de dialeto estão na seção 4.

```sql
-- ---------------------------------------------------------------------------
-- Cadastros
-- ---------------------------------------------------------------------------

CREATE TABLE fin_socio (
  id                VARCHAR(30)  PRIMARY KEY,
  nome              VARCHAR(255) NOT NULL,
  email             VARCHAR(255),
  participacao_bps  INTEGER      NOT NULL DEFAULT 0,  -- 3333 = 33,33%
  ativo             BOOLEAN      NOT NULL DEFAULT TRUE,
  criado_em         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Cadastro deliberadamente mínimo, no mesmo espírito de fin_categoria: só o
-- nome. Não há gestão de projeto aqui — o cliente é o eixo de análise da receita.
CREATE TABLE fin_cliente (
  id        VARCHAR(30)  PRIMARY KEY,
  nome      VARCHAR(255) NOT NULL UNIQUE,
  ativo     BOOLEAN      NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_fin_cliente_ativo ON fin_cliente (ativo);

CREATE TABLE fin_categoria (
  id         VARCHAR(30)  PRIMARY KEY,
  nome       VARCHAR(255) NOT NULL UNIQUE,
  natureza   VARCHAR(10)  NOT NULL DEFAULT 'SAIDA',   -- ENTRADA | SAIDA
  eh_imposto BOOLEAN      NOT NULL DEFAULT FALSE,     -- só UMA linha deve ser TRUE
  cor        VARCHAR(9)   NOT NULL DEFAULT '#2eb3c7',
  ativo      BOOLEAN      NOT NULL DEFAULT TRUE
);
CREATE INDEX idx_fin_categoria_natureza ON fin_categoria (natureza);

-- Garante que exista no máximo UMA categoria de imposto: o índice parcial só
-- cobre as linhas TRUE, então duas delas colidem.
CREATE UNIQUE INDEX uq_fin_categoria_imposto
  ON fin_categoria (eh_imposto) WHERE eh_imposto;

-- ---------------------------------------------------------------------------
-- Ledger
-- ---------------------------------------------------------------------------

CREATE TABLE fin_transacao (
  id               VARCHAR(30)  PRIMARY KEY,
  tipo             VARCHAR(20)  NOT NULL,
    -- ENTRADA | SAIDA | DISTRIBUICAO | APORTE | TRANSFERENCIA
  descricao        VARCHAR(500) NOT NULL,
  valor_centavos   BIGINT       NOT NULL,   -- sempre POSITIVO; o sinal vem de `tipo`

  data_competencia TIMESTAMPTZ  NOT NULL,   -- quando o fato ocorreu
  data_caixa       TIMESTAMPTZ,             -- quando o dinheiro moveu; NULL = pendente

  cliente_id       VARCHAR(30) REFERENCES fin_cliente(id)   ON DELETE SET NULL,
  categoria_id     VARCHAR(30) REFERENCES fin_categoria(id) ON DELETE SET NULL,
  socio_id         VARCHAR(30) REFERENCES fin_socio(id)     ON DELETE SET NULL,
  origem_id        VARCHAR(30) REFERENCES fin_transacao(id) ON DELETE SET NULL,

  recorrente_id    VARCHAR(30) REFERENCES fin_recorrente(id) ON DELETE SET NULL,
  competencia_ref  VARCHAR(7),              -- 'YYYY-MM'

  -- SHA-256 da linha do CSV, ou a referência externa enviada via API.
  -- É a chave de idempotência de toda escrita vinda de fora.
  hash_importacao  VARCHAR(64) UNIQUE,
  importacao_id    VARCHAR(30) REFERENCES fin_importacao(id) ON DELETE SET NULL,

  observacoes      TEXT,
  criado_em        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  atualizado_em    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_fin_transacao_recorrencia UNIQUE (recorrente_id, competencia_ref),
  CONSTRAINT ck_fin_transacao_valor       CHECK (valor_centavos > 0),
  CONSTRAINT ck_fin_transacao_tipo
    CHECK (tipo IN ('ENTRADA','SAIDA','DISTRIBUICAO','APORTE','TRANSFERENCIA'))
);

CREATE INDEX idx_fin_transacao_tipo        ON fin_transacao (tipo);
CREATE INDEX idx_fin_transacao_competencia ON fin_transacao (data_competencia);
CREATE INDEX idx_fin_transacao_caixa       ON fin_transacao (data_caixa);
CREATE INDEX idx_fin_transacao_cliente     ON fin_transacao (cliente_id);
CREATE INDEX idx_fin_transacao_categoria   ON fin_transacao (categoria_id);

-- ---------------------------------------------------------------------------
-- Impostos
-- ---------------------------------------------------------------------------

CREATE TABLE fin_imposto (
  id              VARCHAR(30) PRIMARY KEY,
  receita_id      VARCHAR(30) NOT NULL REFERENCES fin_transacao(id) ON DELETE CASCADE,

  tipo            VARCHAR(20) NOT NULL DEFAULT 'DAS',
  aliquota_bps    INTEGER,        -- NULL = valor informado manualmente
  valor_centavos  BIGINT      NOT NULL,
  anexo           VARCHAR(5),     -- 'III' | 'V'
  rbt12_centavos  BIGINT,         -- deixa a conta auditável depois

  status          VARCHAR(20) NOT NULL DEFAULT 'PROVISIONADO',
    -- PROVISIONADO | PAGO | CANCELADO
  vencimento      TIMESTAMPTZ,

  -- A SAIDA que quitou a guia. NULL enquanto provisionado.
  pagamento_id    VARCHAR(30) REFERENCES fin_transacao(id) ON DELETE SET NULL,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT ck_fin_imposto_status
    CHECK (status IN ('PROVISIONADO','PAGO','CANCELADO')),
  -- Toda guia PAGA precisa apontar para a saída de caixa correspondente.
  CONSTRAINT ck_fin_imposto_pagamento
    CHECK (status <> 'PAGO' OR pagamento_id IS NOT NULL)
);

CREATE INDEX idx_fin_imposto_status     ON fin_imposto (status);
CREATE INDEX idx_fin_imposto_vencimento ON fin_imposto (vencimento);
CREATE INDEX idx_fin_imposto_receita    ON fin_imposto (receita_id);

-- Parâmetros fiscais. Ficam no banco porque legislação muda.
CREATE TABLE fin_faixa_simples (
  id                        VARCHAR(30) PRIMARY KEY,
  anexo                     VARCHAR(5)  NOT NULL,     -- 'III' | 'V'
  faixa                     INTEGER     NOT NULL,     -- 1..6
  limite_inferior_centavos  BIGINT      NOT NULL,
  limite_superior_centavos  BIGINT      NOT NULL,
  aliquota_nominal_bps      INTEGER     NOT NULL,
  deducao_centavos          BIGINT      NOT NULL,
  vigencia_inicio           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_fin_faixa UNIQUE (anexo, faixa, vigencia_inicio)
);
CREATE INDEX idx_fin_faixa_anexo ON fin_faixa_simples (anexo);

-- ---------------------------------------------------------------------------
-- Distribuição e recorrentes
-- ---------------------------------------------------------------------------

CREATE TABLE fin_distribuicao (
  id             VARCHAR(30) PRIMARY KEY,
  transacao_id   VARCHAR(30) NOT NULL UNIQUE
                   REFERENCES fin_transacao(id) ON DELETE CASCADE,
  socio_id       VARCHAR(30) NOT NULL
                   REFERENCES fin_socio(id) ON DELETE RESTRICT,
  natureza       VARCHAR(20) NOT NULL DEFAULT 'LUCRO',
    -- LUCRO | PRO_LABORE | REEMBOLSO   (PRO_LABORE entra no Fator R)
  valor_centavos BIGINT      NOT NULL,
  competencia    VARCHAR(7)  NOT NULL,   -- 'YYYY-MM'
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT ck_fin_distribuicao_natureza
    CHECK (natureza IN ('LUCRO','PRO_LABORE','REEMBOLSO'))
);
CREATE INDEX idx_fin_distribuicao_socio       ON fin_distribuicao (socio_id);
CREATE INDEX idx_fin_distribuicao_competencia ON fin_distribuicao (competencia);

CREATE TABLE fin_recorrente (
  id             VARCHAR(30)  PRIMARY KEY,
  descricao      VARCHAR(500) NOT NULL,
  tipo           VARCHAR(20)  NOT NULL DEFAULT 'SAIDA',
  valor_centavos BIGINT       NOT NULL,
  categoria_id   VARCHAR(30)  REFERENCES fin_categoria(id) ON DELETE SET NULL,
  dia_vencimento INTEGER      NOT NULL DEFAULT 1,
  inicio         TIMESTAMPTZ  NOT NULL,
  fim            TIMESTAMPTZ,
  ativo          BOOLEAN      NOT NULL DEFAULT TRUE,
  observacoes    TEXT,
  criado_em      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT ck_fin_recorrente_dia CHECK (dia_vencimento BETWEEN 1 AND 31)
);
CREATE INDEX idx_fin_recorrente_ativo ON fin_recorrente (ativo);

-- ---------------------------------------------------------------------------
-- Apoio
-- ---------------------------------------------------------------------------

CREATE TABLE fin_importacao (
  id                VARCHAR(30)  PRIMARY KEY,
  arquivo           VARCHAR(500) NOT NULL,
  linhas_total      INTEGER      NOT NULL DEFAULT 0,
  linhas_importadas INTEGER      NOT NULL DEFAULT 0,
  linhas_ignoradas  INTEGER      NOT NULL DEFAULT 0,
  criado_em         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE fin_config (
  chave VARCHAR(100) PRIMARY KEY,
  valor VARCHAR(500) NOT NULL
);

-- Caixinhas: bolso separado, no modelo Nubank/Itaú. Guardar TIRA da conta.
--
-- O saldo NÃO é uma coluna. É sempre a soma dos movimentos — um total gravado
-- que dessincronize mente para sempre e ninguém percebe.
CREATE TABLE fin_caixinha (
  id            VARCHAR(30)  PRIMARY KEY,
  nome          VARCHAR(255) NOT NULL UNIQUE,
  cor           VARCHAR(9)   NOT NULL DEFAULT '#2eb3c7',
  icone         VARCHAR(50)  NOT NULL DEFAULT 'piggy-bank',
  meta_centavos BIGINT,          -- opcional
  meta_data     TIMESTAMPTZ,     -- opcional
  ativa         BOOLEAN      NOT NULL DEFAULT TRUE,
  observacoes   TEXT,
  criado_em     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_fin_caixinha_ativa ON fin_caixinha (ativa);

-- Cada movimento tem 1:1 uma TRANSFERENCIA no ledger, gravada na MESMA
-- transação de banco. Gravar um sem o outro faz o saldo em conta divergir do
-- extrato, e reconciliar isso depois é caro.
CREATE TABLE fin_caixinha_movimento (
  id             VARCHAR(30)  PRIMARY KEY,
  caixinha_id    VARCHAR(30)  NOT NULL
                   REFERENCES fin_caixinha(id) ON DELETE CASCADE,
  tipo           VARCHAR(20)  NOT NULL,  -- DEPOSITO | RESGATE
  valor_centavos BIGINT       NOT NULL,
  data           TIMESTAMPTZ  NOT NULL,
  descricao      VARCHAR(500),
  transacao_id   VARCHAR(30)  UNIQUE
                   REFERENCES fin_transacao(id) ON DELETE SET NULL,
  criado_em      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT ck_fin_mov_tipo  CHECK (tipo IN ('DEPOSITO','RESGATE')),
  CONSTRAINT ck_fin_mov_valor CHECK (valor_centavos > 0)
);
CREATE INDEX idx_fin_mov_caixinha ON fin_caixinha_movimento (caixinha_id);
CREATE INDEX idx_fin_mov_data     ON fin_caixinha_movimento (data);
```

> `fin_transacao` referencia `fin_recorrente` e `fin_importacao`. Se seu
> migrador não resolve ordem de dependência, crie essas duas antes, ou crie
> `fin_transacao` sem as duas FKs e adicione via `ALTER TABLE` depois.

### Seed obrigatório

Sem isto o cálculo de imposto lança exceção:

```sql
INSERT INTO fin_config (chave, valor) VALUES
  ('anexo_simples', 'AUTO'),          -- AUTO | III | V
  ('dia_vencimento_das', '20'),
  ('regime_padrao_dashboard', 'COMPETENCIA');

-- Anexo III (serviços) — CONFIRME COM O CONTADOR. Valores em centavos e bps.
INSERT INTO fin_faixa_simples
  (id, anexo, faixa, limite_inferior_centavos, limite_superior_centavos,
   aliquota_nominal_bps, deducao_centavos) VALUES
  ('fx3_1','III',1,          0,   18000000000,  600,          0),
  ('fx3_2','III',2,  1800000001,   36000000000, 1120,   93600000),
  ('fx3_3','III',3,  3600000001,   72000000000, 1350,  176400000),
  ('fx3_4','III',4,  7200000001,  180000000000, 1600,  356400000),
  ('fx3_5','III',5, 18000000001,  360000000000, 2100, 1256400000),
  ('fx3_6','III',6, 36000000001,  480000000000, 3300, 6480000000);
```

Na prática, prefira rodar `npm run db:seed` apontando para o banco de destino —
o seed é idempotente e evita erro de digitação nesses números.

---

## 4. Mapeamento de tipos por dialeto

| Conceito | PostgreSQL | MySQL 8 | SQL Server | SQLite (atual) |
|---|---|---|---|---|
| ID cuid | `VARCHAR(30)` | `VARCHAR(30)` | `NVARCHAR(30)` | `TEXT` |
| Texto curto | `VARCHAR(n)` | `VARCHAR(n)` | `NVARCHAR(n)` | `TEXT` |
| Texto longo | `TEXT` | `TEXT` | `NVARCHAR(MAX)` | `TEXT` |
| Centavos | `BIGINT` | `BIGINT` | `BIGINT` | `INTEGER` |
| Basis points | `INTEGER` | `INT` | `INT` | `INTEGER` |
| Booleano | `BOOLEAN` | `TINYINT(1)` | `BIT` | `INTEGER` (0/1) |
| Data/hora | `TIMESTAMPTZ` | `DATETIME(3)` | `DATETIME2` | `DATETIME` (UTC) |
| Default agora | `NOW()` | `CURRENT_TIMESTAMP(3)` | `SYSUTCDATETIME()` | `CURRENT_TIMESTAMP` |

### Armadilhas por dialeto

**MySQL**

- `DATETIME` não guarda fuso. Grave **sempre em UTC** e configure a conexão com
  `?timezone=Z`. Sem isso, o fechamento mensal erra o mês uma vez por mês nas
  transações do dia 1º.
- `VARCHAR(500)` como UNIQUE em `utf8mb4` estoura o limite de 3072 bytes do
  índice. `hash_importacao` é `VARCHAR(64)`, então está seguro — não aumente.
- Collation: use `utf8mb4_0900_ai_ci`, senão `nome` UNIQUE de `fin_categoria`
  passa a diferenciar acento e você acaba com "Impostos" e "Ìmpostos".

**SQL Server**

- Não existe `BOOLEAN`: use `BIT` e trate `0/1` no cliente.
- O índice parcial de categoria de imposto vira:
  `CREATE UNIQUE INDEX uq_fin_categoria_imposto ON fin_categoria (eh_imposto) WHERE eh_imposto = 1;`
- **Cuidado com o ciclo de FK:** `fin_imposto` referencia `fin_transacao` duas
  vezes (`receita_id` e `pagamento_id`). O SQL Server rejeita múltiplos caminhos
  de cascade. Deixe `pagamento_id` como `ON DELETE NO ACTION` e trate o estorno
  na aplicação — que é o que o código já faz.

**PostgreSQL**

- Sem armadilha relevante. É o destino mais direto.
- Se usar schema separado (recomendado no cenário B):
  `CREATE SCHEMA financeiro;` e adicione `?schema=financeiro` na `DATABASE_URL`.

---

## 5. Migrando de SQLite para o banco de destino

O Prisma abstrai quase tudo; o trabalho real é mover os dados.

**Passo 1 — trocar o provider**

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"   // ou "mysql" | "sqlserver"
  url      = env("DATABASE_URL")
}
```

```bash
# .env
DATABASE_URL="postgresql://user:senha@host:5432/korvantis?schema=financeiro"
```

**Passo 2 — criar o schema no destino**

```bash
npx prisma db push          # sem histórico de migration
# ou, para versionar:
npx prisma migrate dev --name init_financeiro
```

**Passo 3 — exportar do SQLite**

```bash
# Volte o provider para sqlite temporariamente e rode:
npx tsx scripts/exportar.ts > dump.json
```

Não existe `scripts/exportar.ts` ainda — é um `findMany()` por tabela
serializado em JSON. Vale escrever na hora da migração, respeitando a ordem de
inserção do passo 4.

**Passo 4 — importar respeitando a ordem das FKs**

```
1. fin_config, fin_faixa_simples, fin_categoria, fin_socio, fin_cliente, fin_caixinha
2. fin_recorrente, fin_importacao
3. fin_transacao          (sem preencher origem_id ainda)
4. fin_imposto, fin_distribuicao, fin_caixinha_movimento
5. UPDATE de origem_id e de fin_imposto.pagamento_id  (auto-referências)
```

Os `cuid` são preservados — não gere IDs novos, senão as FKs quebram.

**Passo 5 — conferir antes de considerar migrado**

```sql
-- Os três totais têm que bater com a origem, ao centavo.
SELECT tipo, COUNT(*), SUM(valor_centavos) FROM fin_transacao GROUP BY tipo;
SELECT status, COUNT(*), SUM(valor_centavos) FROM fin_imposto GROUP BY status;
SELECT SUM(valor_centavos) FROM fin_distribuicao;

-- Nenhuma linha deve retornar aqui: guia paga sem saída de caixa.
SELECT * FROM fin_imposto WHERE status = 'PAGO' AND pagamento_id IS NULL;

-- Nenhuma linha deve retornar aqui: distribuição órfã.
SELECT d.* FROM fin_distribuicao d
  LEFT JOIN fin_transacao t ON t.id = d.transacao_id
 WHERE t.id IS NULL;
```

---

## 6. Invariantes: o que o banco **não** protege

Estas regras vivem no código. Se o outro sistema escrever direto nas tabelas,
ele precisa respeitá-las — nenhuma gera erro de banco quando violada, só
relatório errado.

1. **`valor_centavos` é sempre positivo.** O sinal vem de `tipo`. Gravar valor
   negativo inverte silenciosamente todos os totais.

2. **Toda `ENTRADA` deveria ter imposto provisionado.** Receita sem linha em
   `fin_imposto` infla o lucro e o caixa livre. Se a receita for isenta, deixe
   registrado em `observacoes` — o silêncio é indistinguível de esquecimento.

3. **Nunca some `fin_imposto` e a saída de imposto no mesmo relatório.**
   Competência lê `fin_imposto`; caixa lê a `SAIDA` com
   `categoria.eh_imposto = TRUE`. Somar os dois dobra o imposto.

4. **`DISTRIBUICAO` de natureza `LUCRO` não é despesa.** É destinação do lucro
   já apurado. Contá-la como despesa zera o lucro artificialmente.

5. **`REEMBOLSO` também não é despesa.** A despesa original já foi lançada como
   `SAIDA` com `socio_id` preenchido. Contar os dois dobra o gasto.

6. **Só `PRO_LABORE` entra no Fator R.** Se o outro sistema tem folha CLT, ela
   precisa entrar no cálculo — hoje `folhaUltimos12Meses()` em
   `src/lib/simples.ts` só soma pró-labore. Esse é o ponto de extensão.

7. **`hash_importacao` é a chave de idempotência.** Toda escrita vinda de fora
   deve preenchê-lo com um identificador estável e determinístico (o ID do
   registro no sistema de origem serve). Sem isso, retry duplica lançamento — e
   integração com retry é a causa número um de duplicidade.

8. **Guia paga não se reescreve.** Alterar `valor_centavos` de um imposto com
   `status = 'PAGO'` faz o registro divergir da saída de caixa que o quitou.
   Estorne primeiro.

9. **Datas em UTC meia-noite.** Um lançamento do dia 1º gravado em horário local
   UTC-3 é lido como dia 30 do mês anterior, e o fechamento mensal erra.

10. **O saldo da caixinha nunca é uma coluna.** É sempre
    `SUM(DEPOSITO) − SUM(RESGATE)` sobre `fin_caixinha_movimento`. Se alguém
    adicionar um campo `saldo` "para ir mais rápido", basta um movimento gravado
    sem atualizar o total para o número mentir para sempre.

11. **Saldo em conta já vem líquido das caixinhas.** O cálculo é o caixa do
    ledger menos o total guardado. Um painel que mostre o caixa bruto do ledger
    como "saldo" está exibindo dinheiro que não está na conta corrente.

12. **Só provisão com lastro em caixa reduz o caixa livre.** O filtro é
    `fin_transacao.data_caixa IS NOT NULL` na receita que originou a provisão.
    Imposto sobre nota faturada e não recebida é obrigação futura: aparece em
    "a pagar", mas não reduz o distribuível de hoje.

    **Contrapartida obrigatória:** como o DAS vence pelo faturamento e não pelo
    recebimento, esse valor precisa ficar visível em algum lugar do painel. Um
    consumidor que simplesmente ignore `impostoSobreAReceberCentavos` esconde uma
    guia que vai vencer. A regra canônica está em `src/lib/caixa.ts`.

13. **TRANSFERENCIA nunca entra em agregação financeira.** Ela existe só para o
    extrato ficar completo. Não é receita, não é despesa, não afeta lucro e
    **não** é usada para calcular o saldo em conta — quem define quanto saiu para
    as caixinhas são as linhas de `fin_caixinha_movimento`. Somar TRANSFERENCIA
    junto com SAIDA dobra o valor guardado.

14. **Movimento de caixinha e a TRANSFERENCIA que o espelha nascem e morrem
    juntos.** Sempre na mesma transação de banco. Um movimento sem transferência
    deixa um buraco no extrato; uma transferência sem movimento faz o saldo em
    conta divergir do total guardado. Também não crie TRANSFERENCIA pela API —
    a rota `POST /api/v1/transacoes` recusa esse tipo de propósito.

---

## 7. API REST

Base: `http://localhost:3000/api/v1`

**Autenticação.** Sem `API_TOKEN` no `.env`, tudo é liberado (modo local). Ao
expor na rede, defina o token e envie:

```
Authorization: Bearer <API_TOKEN>
```

### `GET /api/v1/resumo`

Painel consolidado. É a rota que evita reimplementar regra de negócio do outro
lado.

```
?regime=COMPETENCIA|CAIXA   (default COMPETENCIA)
&meses=12                   (máx. 48)
```

```jsonc
{
  "regime": "COMPETENCIA",
  "periodo": { "de": "2025-09", "ate": "2026-08" },
  "caixa": {
    "saldoContaCentavos": 8000000,
    "guardadoCentavos": 3000000,
    "patrimonioCentavos": 11000000,
    "impostoSobreRecebidoCentavos": 900000,   // reduz o caixa livre
    "impostoSobreAReceberCentavos": 370098,   // NÃO reduz — ver invariante 12
    "impostoProvisionadoCentavos": 1270098,   // soma dos dois, só exibição
    "caixaLivreCentavos": 7100000,   // conta − imposto sobre recebido
    "caixaLivreProjetadoCentavos": 5229902,
    "aReceberCentavos": 1500000,
    "aPagarCentavos": 320000
  },
  "fiscal": {
    "aliquotaEfetivaBps": 808,       // 8,08%
    "anexo": "III",
    "faixa": 2,
    "rbt12Centavos": 30000000,
    "fatorRBps": 3100,               // 31,00%
    "folha12Centavos": 9300000
  },
  "mensal": [ { "competencia": "2026-08", "faturadoCentavos": 1500000, "impostoCentavos": 121200, "despesaCentavos": 400000, "lucroCentavos": 978800, "distribuidoCentavos": 500000, "retidoCentavos": 478800 } ],
  "socios":  [ { "nome": "…", "lucroCentavos": 0, "proLaboreCentavos": 0, "totalRemuneracaoCentavos": 0 } ],
  "clientes":[ { "nome": "…", "receitaCentavos": 0, "impostoCentavos": 0, "despesaCentavos": 0, "margemCentavos": 0, "margemBps": 0 } ]
}
```

### `GET /api/v1/transacoes`

`?de=2026-01-01&ate=2026-12-31&tipo=ENTRADA&clienteId=…&limite=200` (máx. 1000)

### `POST /api/v1/transacoes`

Cria lançamento. Receitas provisionam DAS automaticamente.

```json
{
  "tipo": "ENTRADA",
  "descricao": "NF 042 — Sprint de agosto",
  "valorCentavos": 1500000,
  "dataCompetencia": "2026-08-05",
  "dataCaixa": "2026-08-12",
  "clienteId": "clxyz…",
  "provisionarImposto": true,
  "referenciaExterna": "fatura-991"
}
```

`referenciaExterna` grava em `hash_importacao`, que é UNIQUE. Reenviar o mesmo
POST devolve **409** com o ID existente, em vez de duplicar. **Sempre envie
esse campo** em integração automatizada.

Respostas: `201` criado · `400` validação · `401` token · `409` duplicado.

### `GET /api/v1/clientes` · `POST /api/v1/clientes`

`POST` recebe `{ "nome": "ACME Ltda" }` e é idempotente por nome: cliente já
existente volta com `200` em vez de criar duplicata. Sincronização que roda
várias vezes não polui a análise de margem.

### Backup completo

`GET /api/export/backup` devolve um JSON versionado com as 12 tabelas e os IDs
originais. É o formato que a tela de Importar restaura, e o único caminho de
migração fiel — ver `src/lib/backup.ts` para a ordem de inserção, que respeita
as FKs, e para o validador.

```jsonc
{
  "financeops": { "versao": 1, "geradoEm": "2026-08-14T14:39:00Z" },
  "resumo": { "transacoes": 27, "impostos": 4, "socios": 6 },
  "dados": { "config": [], "faixasSimples": [], "socios": [] }
}
```

Use isto, e não o CSV, se for migrar de máquina ou de banco: o CSV recalcula o
imposto com as regras de hoje e perde a alíquota histórica.

### Exportações CSV

`GET /api/export/transacoes` (aceita `?de=YYYY-MM&ate=YYYY-MM&tipo=`) ·
`GET /api/export/impostos` · `GET /api/export/modelo`

Saem com `;`, BOM UTF-8 e decimal com vírgula — abrem no Excel pt-BR sem
assistente. O formato de `transacoes` é o mesmo que o importador aceita: dá para
exportar, corrigir na planilha e reimportar sem duplicar.

---

## 8. Consultas úteis para o outro sistema

```sql
-- Saldo EM CONTA = caixa do ledger menos o que foi para as caixinhas.
-- As linhas TRANSFERENCIA do ledger são ignoradas de propósito: quem define
-- quanto saiu da conta são os movimentos das caixinhas.
SELECT
  (SELECT COALESCE(SUM(valor_centavos),0) FROM fin_transacao
    WHERE tipo IN ('ENTRADA','APORTE') AND data_caixa IS NOT NULL)
  - (SELECT COALESCE(SUM(valor_centavos),0) FROM fin_transacao
      WHERE tipo IN ('SAIDA','DISTRIBUICAO') AND data_caixa IS NOT NULL)
  - (SELECT COALESCE(SUM(CASE WHEN tipo='DEPOSITO' THEN valor_centavos
                              ELSE -valor_centavos END),0)
       FROM fin_caixinha_movimento)
  AS saldo_conta_centavos;

-- Saldo de cada caixinha.
SELECT c.nome,
       COALESCE(SUM(CASE WHEN m.tipo='DEPOSITO' THEN m.valor_centavos
                         ELSE -m.valor_centavos END), 0) AS saldo_centavos
  FROM fin_caixinha c
  LEFT JOIN fin_caixinha_movimento m ON m.caixinha_id = c.id
 GROUP BY c.id, c.nome;

-- Caixa livre: saldo EM CONTA menos o imposto que já tem dono.
-- Dois filtros importam: (1) só provisões cuja receita JÁ foi recebida
-- (t.data_caixa IS NOT NULL); (2) o saldo já vem líquido das caixinhas, então
-- elas NÃO são descontadas de novo. Ver invariantes 12 e 13.
SELECT
  (SELECT COALESCE(SUM(valor_centavos),0) FROM fin_transacao
    WHERE tipo IN ('ENTRADA','APORTE') AND data_caixa IS NOT NULL)
  - (SELECT COALESCE(SUM(valor_centavos),0) FROM fin_transacao
      WHERE tipo IN ('SAIDA','DISTRIBUICAO') AND data_caixa IS NOT NULL)
  - (SELECT COALESCE(SUM(im.valor_centavos),0)
       FROM fin_imposto im
       JOIN fin_transacao t ON t.id = im.receita_id
      WHERE im.status = 'PROVISIONADO' AND t.data_caixa IS NOT NULL)
  AS caixa_livre_centavos;

-- Obrigação que NÃO entra no caixa livre, mas precisa aparecer em algum lugar.
SELECT COALESCE(SUM(im.valor_centavos),0) AS imposto_sobre_a_receber_centavos
  FROM fin_imposto im
  JOIN fin_transacao t ON t.id = im.receita_id
 WHERE im.status = 'PROVISIONADO' AND t.data_caixa IS NULL;

-- Margem por cliente.
SELECT c.nome,
       COALESCE(r.receita, 0)  AS receita_centavos,
       COALESCE(i.imposto, 0)  AS imposto_centavos,
       COALESCE(d.despesa, 0)  AS despesa_centavos,
       COALESCE(r.receita,0) - COALESCE(i.imposto,0) - COALESCE(d.despesa,0)
         AS margem_centavos
  FROM fin_cliente c
  LEFT JOIN (SELECT cliente_id, SUM(valor_centavos) receita FROM fin_transacao
              WHERE tipo='ENTRADA' GROUP BY cliente_id) r ON r.cliente_id = c.id
  LEFT JOIN (SELECT cliente_id, SUM(valor_centavos) despesa FROM fin_transacao
              WHERE tipo='SAIDA'   GROUP BY cliente_id) d ON d.cliente_id = c.id
  LEFT JOIN (SELECT t.cliente_id, SUM(im.valor_centavos) imposto
               FROM fin_imposto im
               JOIN fin_transacao t ON t.id = im.receita_id
              WHERE im.status <> 'CANCELADO'
              GROUP BY t.cliente_id) i ON i.cliente_id = c.id
 ORDER BY margem_centavos DESC;

-- Fechamento mensal por COMPETÊNCIA (note: imposto vem de fin_imposto).
SELECT SUBSTRING(CAST(t.data_competencia AS VARCHAR), 1, 7) AS competencia,
       SUM(CASE WHEN t.tipo='ENTRADA' THEN t.valor_centavos ELSE 0 END) AS faturado,
       SUM(CASE WHEN t.tipo='SAIDA'   THEN t.valor_centavos ELSE 0 END) AS despesa
  FROM fin_transacao t
  LEFT JOIN fin_categoria c ON c.id = t.categoria_id
 WHERE COALESCE(c.eh_imposto, FALSE) = FALSE   -- exclui a guia para não dobrar
 GROUP BY 1
 ORDER BY 1;
```

---

## 9. Checklist de integração

- [ ] Rota escolhida (A: API · B: banco compartilhado · C: fusão)
- [ ] Dialeto e schema de destino definidos
- [ ] `provider` e `DATABASE_URL` trocados no `schema.prisma`
- [ ] Schema criado (`prisma db push` ou `migrate`)
- [ ] `fin_config`, `fin_faixa_simples` e `fin_categoria` populados — **sem isso o app quebra**
- [ ] Categoria de imposto marcada com `eh_imposto = TRUE` (exatamente uma)
- [ ] Sócios cadastrados com participações somando 10000 bps
- [ ] Faixas do Simples conferidas com o contador
- [ ] Dados migrados na ordem de FK; totais conferidos ao centavo
- [ ] Queries de sanidade (seção 5, passo 5) retornando vazio
- [ ] `API_TOKEN` definido se a API for exposta na rede
- [ ] Toda escrita automatizada envia `referenciaExterna`
- [ ] As 14 invariantes revisadas com quem vai escrever nas tabelas
- [ ] Rotina de backup do banco de destino no lugar
