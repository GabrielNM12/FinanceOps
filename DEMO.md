# Instância de demonstração

Duas peças independentes: dados fictícios e login desligado. Dá para usar uma
sem a outra.

---

## 1. Os dados

`backups/financeops-demo.json` — 12 meses (2025-09 a 2026-08), 358 registros:

| | |
|---|---|
| Faturado (competência) | R$ 667.000,00 |
| Recebido | R$ 626.000,00 |
| A receber | R$ 41.000,00 |
| Despesas pagas | R$ 200.498,65 |
| Distribuído aos sócios | R$ 316.200,00 |
| Guardado em caixinhas | R$ 26.500,00 |
| Guias de DAS pagas / em aberto | 29 / 3 |

Sócios, clientes e valores são inventados. Os e-mails usam `@exemplo.invalid`
— domínio reservado pela RFC 2606, que nunca existe e nunca recebe link de
acesso.

O último mês fica propositalmente **em aberto**: receitas a receber, contas a
pagar e o DAS ainda não vencido. Um ano perfeitamente fechado esconderia
justamente as telas que tratam de pendência.

### Restaurar

**Importar → Backup completo → Substituir tudo.**

> **Isto apaga os sócios reais e os e-mails de acesso.** Depois de restaurar,
> ninguém entra por magic link, porque nenhum endereço `.invalid` recebe
> e-mail. Numa instância com login ativo, deixe `AUTH_BOOTSTRAP_EMAIL`
> preenchido antes de restaurar — é a única porta que sobra.

### Regerar

```bash
node scripts/gerar-mock.mjs
```

A semente é fixa, então rodar de novo produz exatamente o mesmo arquivo. Com
`Math.random` cada execução geraria um diff enorme e revisar o arquivo seria
impossível.

---

## 2. O login desligado

```bash
# no .env
MODO_DEMO="1"
```

Reinicie. A partir daí não há login: qualquer pessoa com a URL entra.

- Só `1`, `true`, `sim`, `yes` ou `on` ligam. Qualquer outro valor — inclusive
  vazio — mantém o login exigido. `MODO_DEMO=false` desliga de verdade.
- `/login` redireciona para o painel: pedir um link de acesso ali não faria
  sentido, e sem SMTP configurado ele nunca chegaria.
- A sessão assume o **primeiro sócio ativo**, para que autoria e trilha de
  auditoria continuem preenchidas e as telas fiquem realistas.
- Uma tarja amarela fixa aparece em todas as telas.

### Sobre a tarja

Ela é feia de propósito. O risco do modo demo não é alguém ligá-lo — é alguém
**esquecer** que ligou. Um aviso discreto vira paisagem em dois dias, e no dia
em que os dados reais forem restaurados por cima, ninguém lembra que a porta
ficou aberta.

### Desligar

```bash
sed -i '/MODO_DEMO/d' .env
docker compose up -d
```

---

## Na VPS

O `docker-compose.yml` repassa `MODO_DEMO` do `.env`. Vazio é o padrão.

**Uma instância só não serve para as duas coisas.** `financeops.korvantis.io`
tem os dados reais da empresa; ligar o modo demo lá expõe tudo. Para
demonstrar, suba um segundo container com outro subdomínio, outro volume e
outro `.env`:

```bash
# exemplo: demo.korvantis.io
COMPOSE_PROJECT_NAME=financeops-demo
MODO_DEMO=1
```

E aponte o Caddy existente para ele, como em [DEPLOY.md](DEPLOY.md), passo 5.
