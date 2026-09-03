/**
 * Garante que exista um `.env` utilizável antes de qualquer comando do Prisma.
 *
 * POR QUE ISTO EXISTE:
 * `.env` está no `.gitignore` — e deve continuar, porque um dia vai guardar o
 * API_TOKEN. Só que isso significa que quem clona o repositório fica sem ele, e
 * o primeiro comando quebra com uma mensagem que não ajuda em nada:
 *
 *     Error code: P1012
 *     error: Environment variable not found: DATABASE_URL.
 *
 * Roda sozinho antes de `setup`, `dev`, `build`, `start` e dos comandos `db:*`
 * (hooks `pre*` do npm). É .mjs e usa só `node:fs` de propósito: precisa
 * funcionar no Windows, antes de qualquer dependência estar instalada.
 *
 * O valor padrão fica escrito aqui dentro, não só no `.env.example`. Depender de
 * outro arquivo para gerar o arquivo que falta apenas move o problema de lugar.
 */
import { existsSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/** Banco local em arquivo. Caminho relativo à pasta prisma/. */
const LINHA_PADRAO = 'DATABASE_URL="file:./dev.db"';

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = join(raiz, ".env");
const exemplo = join(raiz, ".env.example");

const temDatabaseUrl = (texto) => /^\s*DATABASE_URL\s*=/m.test(texto);

// --- Caso 1: já existe e está completo -------------------------------------
if (existsSync(env)) {
  const conteudo = readFileSync(env, "utf8");

  if (temDatabaseUrl(conteudo)) process.exit(0);

  // Existe mas alguém apagou a linha. Completar é melhor que falhar: o objetivo
  // é o app subir, e nada do que já está no arquivo se perde.
  const separador = conteudo.length > 0 && !conteudo.endsWith("\n") ? "\n" : "";
  appendFileSync(env, `${separador}${LINHA_PADRAO}\n`, "utf8");
  console.log("[FinanceOps] .env estava sem DATABASE_URL — linha adicionada.");
  process.exit(0);
}

// --- Caso 2: não existe ----------------------------------------------------
// Usa o .env.example quando ele serve; senão, cai no padrão embutido.
let conteudo = `${LINHA_PADRAO}\n`;
let origem = "padrão embutido";

if (existsSync(exemplo)) {
  const modelo = readFileSync(exemplo, "utf8");
  if (temDatabaseUrl(modelo)) {
    conteudo = modelo;
    origem = ".env.example";
  }
}

writeFileSync(env, conteudo, "utf8");
console.log(`[FinanceOps] .env criado (${origem}).`);
