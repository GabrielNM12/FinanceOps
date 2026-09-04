# Upwork portfolio item — FinanceOps

Paste-ready. Three length options; pick by how much room the field gives you.

---

## Title (69 chars)

```
FinanceOps — Cash, Tax & Profit-Sharing System for a 6-Partner Agency
```

Alternates:

```
Full-Stack Financial Control System (Next.js, TypeScript, Prisma, Docker)
Internal Finance Platform: Brazilian Tax Engine, Audit Trail, Self-Hosted
```

---

## Description — full version

**The problem**

A six-partner software agency was tracking company money in a spreadsheet and
a group chat. Every month ended the same way: nobody could say who had paid
what, how much was actually available to distribute, or how much of the balance
was already owed to the tax authority. The number in the bank account looked
like profit right up until the tax bill arrived.

**What I built**

A self-hosted financial control system the six partners use to run the company:
one ledger for every movement, automatic tax provisioning, profit distribution
per partner, and goal-based savings envelopes.

**The decisions that mattered**

*Money is never a float.* Every amount is stored as an integer number of cents,
every percentage as basis points. Floating-point arithmetic drifts, and in a
financial report drift becomes a few cents nobody can explain — which quietly
destroys trust in the whole tool.

*Two dates per transaction, not one.* Accrual date and cash date are separate
fields. Invoicing in March and getting paid in May are different facts, and
collapsing them into one date makes it impossible to answer either "what did we
earn?" or "what do we actually have?" The dashboard switches between the two
views.

*A real tax engine, not a fixed percentage.* Brazil's Simples Nacional
computes an effective rate from trailing 12-month revenue against bracket
tables, with a payroll ratio ("Fator R") deciding which annex applies. The rate
used is stored on each provision, so changing a bracket later never rewrites
history. Tax appears in two separate places by design — accrued provisions and
paid receipts — and the system never sums them together.

*Free cash tells the truth.* The headline number subtracts tax owed on revenue
that has already been received. It is deliberately more pessimistic than the
bank balance, because the pleasant number is the one that gets companies into
trouble.

*Passwordless auth, hand-rolled.* Single-use, hashed, 15-minute email links and
an HMAC-signed session cookie using Web Crypto, so identical code runs in both
the Edge middleware and the Node server. The middleware checks the signature;
the real authorization check re-runs against the database on every request, so
revoking someone takes effect immediately rather than whenever their cookie
expires.

*Append-only audit trail.* Every entry records who typed it, separately from
who the money belonged to — the person who logs an expense is rarely the person
who paid it.

**Engineering**

- Next.js 14 (App Router), TypeScript strict, Prisma, SQLite, Tailwind
- All 11 routes ship static; data arrives by fetch behind skeleton loaders.
  Cutting the dashboard from 217 kB to 107 kB made navigation feel instant
- 237 assertions covering the pure calculation core — money parsing, tax
  brackets, cash rules, CSV import, backup integrity — with no test framework,
  because the code under test is pure functions
- CSV import with SHA-256 row hashing to block double-imports; full JSON
  backup/restore that preserves IDs, so a restore reproduces the database
  rather than something similar
- Docker Compose behind Caddy with automatic TLS; GitHub Actions deploys every
  push to `main` through a self-hosted runner that backs up the database first
  and rolls back automatically if the health check fails

**Result**

Replaced the spreadsheet. Reconciled a full bank statement to the cent on first
import. The monthly "who paid what?" conversation stopped happening.

---

## Description — short version (~120 words)

A six-partner software agency was tracking company money in a spreadsheet and a
group chat, with no reliable answer to "how much can we actually distribute?"

I built a self-hosted financial system: single ledger, automatic tax
provisioning under Brazil's Simples Nacional, per-partner profit distribution,
and savings envelopes. Amounts are integer cents and percentages are basis
points — no floating-point money anywhere. Each transaction carries both an
accrual and a cash date, so "what we earned" and "what we hold" stay different
questions. Free cash subtracts tax already owed on money received, which makes
it deliberately less flattering than the bank balance.

Next.js 14, TypeScript, Prisma, Docker, Caddy. 237 tests over the calculation
core. Every push to `main` deploys itself, with automatic rollback.

---

## Skill tags

```
Next.js · React · TypeScript · Node.js · Prisma · PostgreSQL · SQLite
Tailwind CSS · Docker · CI/CD · GitHub Actions · REST API · Financial Software
Accounting Software · Full-Stack Development · Authentication · Data Migration
```

---

## Notes before you publish

- **Screenshots carry more weight than the text.** Use the demo instance
  (`MODO_DEMO=1` with `financeops-demo.json` loaded) so no real figures leave
  the company. Best four: dashboard with the charts, the tax screen showing
  provisioned vs paid, savings envelopes, audit trail.
- **The claims are checkable, so keep them true.** 237 assertions, 217 kB →
  107 kB, 11 static routes, reconciled to R$ 0.01. If any of that changes,
  change the text.
- "Six-partner software agency" is the anonymized framing. If you later decide
  to name the company, say it is your own — an internal tool you built for your
  own business reads stronger than an unnamed client, not weaker.
- Upwork truncates the description in previews. The first two sentences are
  what most people read; they carry the problem, not the stack.
