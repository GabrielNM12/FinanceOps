#!/bin/sh
set -e

# Prepara o banco antes de subir o servidor.
#
# `db push` é idempotente: na primeira execução cria o arquivo e as tabelas; nas
# seguintes, não faz nada se o schema não mudou. Isso permite `docker compose up`
# repetido sem passo manual e sem risco para os dados.
#
# Roda a cada início de container de propósito — depois de um `git pull` com
# schema novo, é isto que aplica a alteração.

# Chama o CLI do Prisma pelo caminho do módulo, não por `npx`.
#
# `npx` tenta resolver o pacote no registro quando não o encontra localmente, o
# que numa VPS sem rede de saída (ou com o npm fora do ar) faz o container
# morrer na subida por um motivo que não tem nada a ver com o app.
prisma_cli() {
  if [ -x node_modules/.bin/prisma ]; then
    node_modules/.bin/prisma "$@"
  else
    node node_modules/prisma/build/index.js "$@"
  fi
}

echo "[FinanceOps] preparando o banco em ${DATABASE_URL}"
prisma_cli db push --skip-generate

# O seed popula faixas do Simples, categorias e sócios. É idempotente (upsert),
# então não sobrescreve nada que já exista.
echo "[FinanceOps] aplicando seed (idempotente)"
node scripts/seed-runtime.mjs

echo "[FinanceOps] iniciando servidor"
exec "$@"
