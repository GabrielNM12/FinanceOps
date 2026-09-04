# FinanceOps

Gestão financeira da Korvantis.

Controle de caixa, impostos e distribuição entre sócios. Roda localmente, banco
em arquivo, sem login.

---

## Como rodar

Requisitos: Node.js 18.18 ou superior. Um comando só, do clone ao app no ar:

```bash
git clone <repo> financeops && cd financeops
npm run tudo
```

`tudo` faz `npm install`, prepara o banco, compila e sobe em modo produção.
Abra <http://localhost:3000>.

Rodar de novo é seguro: `db push` e o seed são idempotentes, nada é apagado.

Para desenvolver, o de sempre:

```bash
npm install
npm run dev
```

### O que NÃO vem no repositório

Três coisas são ignoradas pelo git de propósito. Saber disso evita surpresa ao
clonar em outra máquina:

| Arquivo | Por que fica de fora | Como recuperar |
|---|---|---|
| `.env` | Vai guardar o `API_TOKEN` um dia | Criado sozinho, sem intervenção |
| `prisma/dev.db` | São dados financeiros reais | `npm run tudo` cria vazio; restaure o backup depois |
| `backups/` | Idem | Precisa ter sido copiado para fora antes |

O `.env` é criado automaticamente pelos hooks `pre*` do npm, antes de `setup`,
`dev`, `build`, `start` e dos comandos `db:*`. O valor padrão
(`DATABASE_URL="file:./dev.db"`) está escrito dentro do próprio
`scripts/preparar-env.mjs` — ele não depende do `.env.example` existir, porque
depender de outro arquivo para gerar o arquivo que falta só muda o problema de
lugar.

Sem esse cuidado, o primeiro comando quebrava com uma mensagem que não ajuda:

```
Error code: P1012
error: Environment variable not found: DATABASE_URL.
```

**Um clone limpo não tem seus dados.** Depois de subir, o banco está vazio — vá
em Importar → Backup completo e carregue o `.json` mais recente.

### Idioma

O app é uma língua por deploy, escolhida no **build** por
`NEXT_PUBLIC_APP_LOCALE` no `.env`. Ausente ou qualquer valor ≠ `en` mantém o
português (padrão). `NEXT_PUBLIC_APP_LOCALE="en"` liga o inglês — interface,
caminhos das URLs (`/impostos` → `/taxes`, …), e-mails de acesso e formato de
número (`R$ 1,234.56`; a moeda continua BRL). Os termos do Simples Nacional
(DAS, Fator R, RBT12, pró-labore, Anexo III/V) ficam como estão nas duas
línguas. A trilha de auditoria não é traduzida: cada evento fica no idioma em
que foi gravado.

### Comandos

| Comando | O que faz |
|---|---|
| `npm run tudo` | Do clone ao app no ar: install, setup, build e start |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm start` | Build e execução em produção |
| `npm test` | Testes do núcleo de cálculo (208 asserções, sem banco) |
| `npm run typecheck` | Verificação de tipos |
| `npm run db:backup` | Backup consistente do banco + CSV, em `backups/` |
| `npm run auth:diagnostico` | Por que o e-mail de acesso não chegou |
| `npm run db:studio` | Prisma Studio — inspeciona o banco na mão |
| `npm run db:reset` | **Apaga tudo** e repopula o seed |

---

## Primeiros passos

O seed já cria os 6 sócios em partes iguais e as categorias (Projetos, Impostos,
Ferramentas, Contabilidade, Escritório). Falta:

1. **Configurações → Clientes** — cadastre seus clientes. É só o nome; eles
   aparecem no seletor ao lançar receita e viram o eixo da análise de margem.
2. **Configurações → Faixas do Simples** — confira com seu contador e ajuste o
   que estiver diferente. Deixe o anexo em "Automático".
3. **Recorrentes** — cadastre os gastos fixos (cloud, licenças, contabilidade).
   Ao salvar, os meses já vencidos desde a data de início são gerados na hora.
4. **Importar** — traga o extrato bancário em CSV, ou lance na mão.

### Navegação

Sidebar fixa à esquerda (drawer no mobile), com ícones do `lucide-react`:
Dashboard, Lançamentos, Impostos, Caixinhas, Recorrentes, Importar e
Configurações.
Clientes, sócios, categorias e parâmetros fiscais vivem todos dentro de
Configurações — são cadastros de apoio, não telas de operação diária.

**A rota troca na hora.** Clicar num item da sidebar não espera resposta de
servidor. São três camadas, nesta ordem:

1. **`loading.tsx` em cada rota.** É ele que faz a URL mudar no mesmo instante
   do clique. Sem esse arquivo, o Next segura a tela antiga até o JavaScript da
   rota nova terminar de baixar — o esqueleto dentro do componente só apareceria
   *depois* disso, o que derrota o propósito. Com a fronteira de Suspense, o Next
   confirma a navegação e desenha o esqueleto como HTML estático, sem esperar JS.
2. **O componente monta** e mostra o mesmo esqueleto enquanto busca o JSON por
   `fetch`. A transição entre os dois é invisível, de propósito.
3. **Os dados chegam** e preenchem o miolo. Título, filtros e estrutura já
   estavam lá desde o passo 1.

O esqueleto tem exatamente as dimensões do conteúdo real. Um placeholder de
tamanho diferente faz a página saltar quando os dados chegam, e o salto incomoda
mais do que a espera.

Depois de uma ação (lançar, excluir, quitar), o refetch é **silencioso**: uma
faixa fina aparece no topo e os dados antigos continuam na tela até os novos
chegarem. Voltar ao esqueleto a cada clique seria pior.

### Peso das rotas

Todas as telas são estáticas (`○` no build): nenhuma faz trabalho de servidor
antes de navegar. O dashboard era a exceção porque carregava o recharts junto:

| Rota | Antes | Depois |
|---|---|---|
| `/` (dashboard) | 217 kB | **107 kB** |
| demais telas | 94–106 kB | 94–106 kB |

Os gráficos agora entram por `next/dynamic` (`src/components/graficos-lazy.tsx`),
num chunk separado que baixa depois da casca da tela. Os KPIs e o Fator R
aparecem sem esperar a biblioteca de gráficos.

### Por que o `npm run dev` parece lento na primeira navegação

Em desenvolvimento o Next **compila cada rota sob demanda**, no primeiro clique,
e desliga o prefetch dos links. Então a primeira visita a cada tela paga o custo
da compilação — e isso não existe em produção.

Para uso diário, rode em produção:

```bash
npm run build
npm start
```

Aí as rotas já vêm compiladas, o `<Link>` faz prefetch de tudo que está visível
na sidebar, e a navegação passa a ser instantânea de verdade.

### Duas APIs, de propósito

| Rota | Para quem | Contrato |
|---|---|---|
| `/api/ui/*` | Só para as telas deste app | Muda junto com o layout, sem aviso |
| `/api/v1/*` | Sistema interno, integrações | Estável — ver `INTEGRACAO.md` |

Se a UI consumisse `/api/v1`, qualquer ajuste de tela viraria uma quebra
silenciosa no sistema que consome os dados. São públicos diferentes.

**A escrita continua em Server Actions.** Só a leitura virou `fetch`. As actions
já validam, já rodam em transação e já conhecem as regras do domínio;
transformá-las em POST só para "ser SPA" duplicaria essa lógica no cliente — e é
no cliente que a validação some.

---

## As decisões que importam

### Dinheiro é inteiro em centavos

Nenhum valor monetário existe como `Float` em lugar nenhum. `0.1 + 0.2` em
ponto flutuante dá `0.30000000000000004`, e num relatório financeiro isso vira
divergência de centavos que ninguém consegue explicar. Percentuais seguem a
mesma lógica, em *basis points*: `600` = 6,00%.

### Toda transação tem duas datas

`dataCompetencia` é quando o fato aconteceu (o serviço foi faturado).
`dataCaixa` é quando o dinheiro se moveu — `null` significa pendente.

É isso que permite o toggle **Caixa / Competência** no dashboard e faz
"faturado" e "recebido" serem números diferentes. Uma NF emitida em janeiro e
paga em março aparece em janeiro no regime de competência e em março no de
caixa, como deve ser.

### O imposto mora em dois lugares — e nunca é somado nos dois

Ao lançar uma receita, o DAS é **provisionado** na tabela `fin_imposto`: reduz
o lucro e o caixa livre, mas ainda não é saída de caixa. Quando você paga a
guia em `/impostos`, aí sim nasce uma `SAIDA` no ledger.

Por consequência:

- No regime de **competência**, o imposto vem de `fin_imposto` e as saídas com
  categoria de imposto são excluídas.
- No regime de **caixa**, o imposto vem da guia paga e `fin_imposto` é ignorada.

Toda leitura passa por `src/lib/queries.ts` justamente para que nenhuma tela
monte agregação própria e acabe contando duas vezes.

### Caixa livre

```
caixa livre = saldo em CONTA − imposto provisionado sobre receita JÁ RECEBIDA
```

É o número mais útil do sistema: a conta pode ter R$ 80 mil, mas se R$ 9 mil já
são DAS sobre dinheiro que entrou, o que dá para distribuir são R$ 71 mil.

Dinheiro nas caixinhas **não** aparece nessa conta porque já saiu da conta
corrente — descontar de novo contaria duas vezes.

**Imposto sobre receita a receber não entra.** Uma nota faturada e não paga não
colocou dinheiro na conta, então o imposto dela não pode tirar. Quando o cliente
pagar, os dois entram juntos — a receita no saldo, o imposto no desconto.

O preço dessa escolha, que vale saber: **o DAS vence pelo faturamento, não pelo
recebimento**. Se o cliente atrasar, a guia vence do mesmo jeito e vira uma saída
que o caixa livre não antecipou. Por isso o valor continua visível em três
lugares — no card "A receber", no total de "A pagar" e num alerta próprio no
dashboard — e a tela de Impostos marca cada guia como *recebida* ou *a receber*.
A obrigação não some; ela só deixa de reduzir o que é distribuível hoje.

A regra vive em `src/lib/caixa.ts`, pura e coberta por testes, para não haver
duas definições no código.

### Caixinhas

Bolso separado, no modelo Nubank/Itaú. Guardar **tira da conta** e põe na
caixinha; resgatar faz o caminho de volta. Cada caixinha tem nome, cor, ícone e
uma meta opcional com barra de progresso.

Três números diferentes, e vale saber qual é qual:

| Número | O que é |
|---|---|
| **Em conta** | Dinheiro na conta corrente, já líquido do que está guardado |
| **Guardado** | Soma das caixinhas |
| **Patrimônio** | Conta + caixinhas. Não muda quando você guarda |

Guardar **não** afeta o lucro do mês — não é receita nem despesa, é transferência
entre bolsos seus. O que muda é o caixa livre, porque o dinheiro deixou de estar
disponível.

Cada movimento grava dois registros na mesma transação de banco: o movimento da
caixinha (fonte da verdade do saldo) e uma `TRANSFERENCIA` no ledger, para o
extrato do app ficar completo e reconciliável com o do banco. Se um falhar,
nenhum é gravado.

**O saldo da caixinha nunca é armazenado** — é sempre a soma dos movimentos. Um
total gravado que dessincronize mente para sempre e ninguém percebe.

Regras que o sistema impõe: não dá para guardar mais do que há em conta, nem
resgatar mais do que a caixinha tem. Caixinha com saldo não pode ser arquivada, e
caixinha com histórico não pode ser excluída — apagar removeria transferências do
extrato e mudaria o saldo em conta retroativamente.

Não confunda com **Aporte**, que é dinheiro novo entrando na empresa: o sócio
injeta capital, o patrimônio sobe, mas não conta como receita nem gera imposto.

### Alíquota calculada, não digitada

No Simples a alíquota efetiva depende do RBT12 (receita bruta dos últimos 12
meses) — e o app já tem esse histórico:

```
efetiva = (RBT12 × nominal − dedução) ÷ RBT12
```

O anexo vem do **Fator R** (`folha ÷ RBT12`): 28% ou mais leva ao Anexo III,
que começa em 6,00%; abaixo disso é o Anexo V, que começa em 15,50%. Pró-labore
conta como folha; distribuição de lucros não. O dashboard mostra o Fator R atual
e quanto falta para os 28%, mas não decide nada — essa conversa é com o contador.

As faixas ficam **na tabela `fin_faixa_simples`**, não no código. Legislação
muda e recompilar o app por causa disso seria um erro. Edite em Configurações.

### Distribuição, pró-labore e reembolso são coisas diferentes

| Natureza | É despesa? | Entra no Fator R? |
|---|---|---|
| `LUCRO` | Não — é destinação do lucro | Não |
| `PRO_LABORE` | Sim | **Sim** |
| `REEMBOLSO` | Não — a despesa já foi lançada | Não |

Tratar as três como "saída" inflaria a despesa e esconderia o Fator R.

### Recorrentes são materializados

Quando um recorrente vence, um lançamento real é criado (pendente de pagamento),
não calculado na hora. Assim você edita o valor daquele mês — a conta de luz
nunca vem igual — e o histórico bate com o extrato bancário. A idempotência vem
da unique `(recorrenteId, competenciaRef)`: rodar a geração 50 vezes produz os
mesmos lançamentos.

O **futuro** continua sendo cálculo puro, sem gravar nada. Materializar o futuro
criaria despesa que ainda não existe e sujaria todo relatório de competência.

### Restaurar um backup

Importar → **Backup completo** aceita o `.json` em dois passos, como o CSV. O
preview mostra, tabela por tabela, o que existe hoje e o que vem no arquivo.

Dois modos:

- **Substituir tudo** — apaga o conteúdo atual e recria o banco a partir do
  arquivo. Os IDs são preservados, então o resultado é idêntico ao original, não
  parecido. Exige confirmação explícita quando já há dados.
- **Mesclar** — insere só o que ainda não existe, por id. Nada é sobrescrito:
  um lançamento editado depois do backup fica como está.

Tudo roda numa transação só. Se uma linha falhar, nada é gravado — um banco pela
metade seria pior que o estado anterior. Antes de gravar, o sistema confere que
toda chave estrangeira do arquivo aponta para um registro presente nele.

### Auditoria: quem fez o quê

Duas coisas diferentes, de propósito:

| Onde | Responde | Custo |
|---|---|---|
| `fin_transacao.criadoPorId` | "Quem lançou isto?" | Direto na linha, sem join |
| `fin_auditoria` | "O que aconteceu no sistema?" | Uma linha por evento |

Uma não substitui a outra. Só o campo no ledger perderia as **exclusões** — o
registro some e leva o autor junto. Só a trilha obrigaria um join por linha para
mostrar o autor na lista de lançamentos.

A trilha registra o que não vira lançamento: guia paga, guia estornada,
importação de CSV, restauração de backup, troca de e-mail de acesso, exclusão.

**É append-only.** Nada ali é editado ou apagado pela aplicação — um registro que
o próprio sistema pode alterar não serve para auditar o sistema. Restaurar um
backup em "substituir tudo" apaga a trilha anterior, mas o evento de restauração
é gravado logo depois e sobrevive.

`registrar()` **nunca lança**. Se a auditoria falhar, a operação já aconteceu;
derrubar a requisição faria a pessoa achar que nada foi salvo, quando foi. Fica
fora da transação de banco pelo mesmo motivo.

Os lançamentos anteriores à auditoria foram atribuídos ao Gabriel Muller por
`scripts/retroagir-autoria.mjs` — e essa atribuição em massa está registrada na
própria trilha. Auditoria que esconde como os dados chegaram lá dá confiança sem
base.

### No celular

A sidebar já era drawer. O que mudou:

- **Tabelas viram cartões abaixo de `md`** em Lançamentos, Impostos e
  Recorrentes. Oito colunas não cabem em 360px, e rolagem horizontal em lista
  financeira faz perder a coluna de valor.
- **KPIs em duas colunas**, com o número menor. Cinco cartões empilhados exigiam
  rolar a tela inteira antes de ver um gráfico.
- **Configurações manteve tabela com rolagem.** São três tabelas numa tela de
  ajuste raro no celular; rolar é pior que cartão, mas muito melhor que esconder
  sem substituto.
- Alvos de toque maiores nos botões de ação e caixas de seleção.

### Importação nunca duplica

Cada linha do CSV vira um SHA-256 de `data + valor + descrição normalizada`,
gravado num campo `unique`. Reimportar o extrato do mês inteiro pula o que já
existe. A importação é sempre em dois passos — preview e confirmação — porque um
CSV errado polui meses de histórico e não existe desfazer barato.

---

## Acesso

Login por **magic link**: digita o e-mail, recebe um botão, clica e entra. Não
existe senha para vazar, reusar ou esquecer.

### Como está montado

Deliberadamente pequeno — uma tabela e um cookie:

| Peça | O que faz |
|---|---|
| `fin_token_acesso` | Token do link, guardado **hasheado**, uso único, 15 min |
| Cookie assinado | HMAC-SHA256 sobre `{email, exp}`. Sem tabela de sessão |
| `src/lib/acesso.ts` | A regra de quem pode entrar — pura e testada |

Não há tabela de usuário nem de sessão. A identidade é o `fin_socio.email`, e a
sessão é um cookie que carrega o próprio conteúdo assinado. Isso não enfraquece
a revogação: `sessaoAtual()` confere **a cada requisição** se o e-mail ainda
pertence a um sócio ativo, então desativar alguém corta o acesso na hora.

A assinatura usa **Web Crypto**, não `node:crypto`. É o que permite o mesmo
código validar o cookie no middleware (runtime Edge) e no servidor, sem
configuração duplicada.

### Quem consegue entrar

Só e-mail cadastrado em um sócio **ativo**, em Configurações → Sócios. Não há
auto-cadastro.

A tela responde **a mesma coisa** para e-mail autorizado e desconhecido. Dizer
"este e-mail não está cadastrado" transformaria o login num verificador de quem
trabalha na Korvantis, aberto para qualquer pessoa na internet.

### Primeira entrada

`Gabriel Muller` já vem com `gabrielnmuller12@gmail.com` no seed. Os outros
cinco sócios estão sem e-mail e precisam ser preenchidos em Configurações.

Se precisar de uma entrada de emergência — por exemplo, um banco novo em que
ninguém tem e-mail:

```bash
AUTH_BOOTSTRAP_EMAIL="voce@korvantis.com"
```

Esse endereço entra sem estar em nenhum sócio. **Apague a variável** depois.

### Trocar o e-mail de um sócio

Em Configurações → Sócios, no ícone de lápis ao lado do endereço. O e-mail muda
e os links pendentes do endereço antigo são apagados, na mesma transação.

A sessão aberta do endereço antigo não precisa de tratamento especial: como o
cookie é revalidado contra o cadastro a cada requisição, e aquele e-mail deixou
de existir ali, o acesso cai na requisição seguinte.

### Onde a autorização é aplicada

| Camada | Pergunta | Runtime |
|---|---|---|
| `middleware.ts` | "A assinatura do cookie confere?" Redireciona para `/login` | Edge |
| `exigirSocio()` | "Este e-mail ainda é de sócio ativo?" | Node, com banco |
| `exigirAcesso()` | Mesma pergunta, nas 38 server actions que escrevem | Node, com banco |

**O middleware não é fronteira de segurança** — ele não consulta o banco, só
valida a assinatura. A checagem que vale é refeita no servidor.

Server actions recebem guarda própria porque são endpoints POST como outro
qualquer: quem souber o ID de uma action consegue chamá-la sem passar por tela.

Quando a sessão cai com a tela já aberta, o cliente **redireciona para o login**
em vez de mostrar "erro ao carregar" — tanto no `fetch` que recebe 401 quanto na
server action que recusa. O caminho de volta é preservado em `?destino=`, então
depois de entrar a pessoa volta para onde estava.

### Configurar o envio

```bash
AUTH_SECRET="..."                  # openssl rand -base64 32
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="financeops@korvantis.com"
SMTP_PASS="senha-de-app"           # não a senha da conta
EMAIL_FROM="FinanceOps <financeops@korvantis.com>"
```

Sem SMTP configurado, em desenvolvimento o link aparece no **console** — dá para
testar o fluxo inteiro sem credencial nenhuma. Em produção o login recusa
funcionar, para ninguém achar que mandou e-mail sem ter mandado.

`APP_URL` é opcional: sem ela, a URL do link é deduzida dos cabeçalhos da
requisição, o que já cobre o desenvolvimento e o proxy reverso da VPS.

### "Pedi o link e não chegou e-mail"

```bash
npm run auth:diagnostico                       # confere tudo
npm run auth:diagnostico -- voce@email.com     # e manda um teste real
```

O script existe porque a tela de login responde a mesma coisa para e-mail
autorizado e desconhecido — de propósito. O efeito colateral é que "não recebi"
tem quatro causas indistinguíveis pela interface:

| Causa | Como reconhecer |
|---|---|
| **O endereço não está cadastrado** | O log do servidor diz `acesso NEGADO ... nenhum e-mail foi enviado` e lista os cadastrados |
| **O sócio está inativo** | Mesmo log, motivo `INATIVO` |
| **O SMTP não subiu com o processo** | O console mostra um bloco grande com o link e o aviso de reiniciar |
| **O SMTP recusou** | A tela mostra erro de verdade, e o log traz a resposta do servidor |

**A causa mais comum é a terceira.** Variáveis de ambiente são lidas quando o
processo sobe: preencher o `.env` com `npm run dev` já rodando não tem efeito
nenhum até reiniciar — e como em desenvolvimento o link cai no console, não
aparece erro em lugar algum.

Duas armadilhas do Gmail que o diagnóstico detecta sozinho:

- **Senha de app com espaço.** O Google mostra `abcd efgh ijkl mnop`; cole sem os
  espaços, são 16 caracteres.
- **Senha da conta em vez de senha de app.** Exige 2FA ativado e um app password
  gerado especificamente.

---

## Deploy na VPS

Guia completo e copiável em **[DEPLOY.md](./DEPLOY.md)** — DNS na Cloudflare,
deploy key do GitHub, Docker, firewall, primeiro login e backup automático.

Resumo do que sobe:

```
internet → Caddy (80/443, HTTPS automático) → financeops:3000 (rede interna)
                                                    ↓
                                          volume financeops-dados
                                          /dados/financeops.db
                                          /dados/backups/
```

O app **não publica porta no host**: só o Caddy fala com a internet, e ele
termina o TLS. Isso importa porque o link de acesso do e-mail é uma credencial —
em HTTP puro, quem estiver no caminho da rede lê e entra.

```bash
cd ~/financeops
./docker/atualizar.sh          # backup, git pull, rebuild, sobe, confere saúde
```

---

## O que este sistema **não** é

Vale ser explícito para evitar frustração:

- **Não é software contábil.** Não gera DRE fiscal, não apura tributos oficiais,
  não emite guia. Os cálculos são estimativas para vocês tomarem decisão — a
  apuração oficial é do contador.
- **Não calcula encargos de pró-labore** (INSS, IRRF). Lance o valor bruto e os
  encargos como despesa separada.
- **A fonte da verdade ainda é humana.** Se ninguém lançar, o sistema mente com
  confiança. Por isso a importação de CSV é o recurso mais valioso da lista —
  mais que os gráficos.
- **O acesso é por e-mail, sem senha.** Quem controla a caixa de entrada de um
  sócio controla o acesso dele. Ative 2FA nas contas de e-mail de vocês.

---

## Estrutura

```
prisma/
  schema.prisma        # modelo de dados, todas as tabelas com prefixo fin_
  seed.ts              # faixas do Simples + categorias + os 6 sócios
src/
  lib/
    money.ts           # centavos, bps, rateio sem perder centavo
    datas.ts           # competência, janelas, tudo ancorado em UTC
    simples-calc.ts    # aritmética pura do Simples (é o que os testes cobrem)
    simples.ts         # a casca que busca dados e chama simples-calc
    queries.ts         # TODA leitura agregada do dashboard
    recorrentes.ts     # materialização idempotente + projeção
    caixa.ts           # caixa livre, saldo e meta de caixinha (puro, testado)
    csv.ts             # parser, hash de dedupe, exportação
    db.ts              # singleton do Prisma
    api-auth.ts        # token opcional da API de integração
  actions/             # server actions (escrita)
  app/
    page.tsx           # dashboard
    transacoes/        # lançamentos
    impostos/          # provisões e guias
    caixinhas/         # bolsos separados por objetivo
    recorrentes/       # gastos fixos
    importar/          # CSV
    configuracoes/     # sócios, clientes, categorias, fiscal, backup
    api/v1/            # API de integração
    api/export/        # CSV de saída
  components/
    Sidebar.tsx        # navegação (client, só por causa do usePathname)
    graficos.tsx       # recharts — não faz conta, só desenha
    ...
```

Regra de ouro ao mexer: **leitura agregada vai em `queries.ts`, aritmética vai
em `simples-calc.ts` ou `money.ts`**. Componente não faz conta — só desenha o
que a camada de dados já calculou. É isso que impede a tela e o relatório de
divergirem.

---

## Integração com outro sistema

Ver [`INTEGRACAO.md`](./INTEGRACAO.md) — DDL agnóstico, mapeamento de tipos por
dialeto, rotas da API e o passo a passo de migração para Postgres, MySQL ou SQL
Server.
