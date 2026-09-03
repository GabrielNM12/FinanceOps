#!/usr/bin/env bash
#
# Atualiza o FinanceOps na VPS.
#
#     ./docker/atualizar.sh
#
# Faz backup ANTES de qualquer coisa. Uma atualização que dá errado sem backup
# recente é a diferença entre cinco minutos de susto e uma tarde reconstruindo
# lançamentos a partir do extrato.
set -euo pipefail

cd "$(dirname "$0")/.."

azul()  { printf '\033[36m%s\033[0m\n' "$1"; }
verde() { printf '\033[32m%s\033[0m\n' "$1"; }

azul "1/5  Backup antes de mexer"
if docker compose ps --status running --quiet financeops > /dev/null 2>&1; then
  docker compose exec -T financeops node scripts/backup-runtime.mjs \
    || echo "     (app ainda não estava no ar — seguindo)"
else
  echo "     (app parado — nada para salvar)"
fi

azul "2/5  Buscando a versão nova"
git pull --ff-only

azul "3/5  Reconstruindo a imagem"
docker compose build

azul "4/5  Subindo"
# `up -d` recria só o que mudou. O volume dos dados não é tocado; o entrypoint
# aplica alterações de schema com `prisma db push`, que é idempotente.
docker compose up -d

azul "5/5  Conferindo saúde"
for i in $(seq 1 30); do
  estado=$(docker inspect --format '{{.State.Health.Status}}' financeops 2>/dev/null || echo "starting")
  if [ "$estado" = "healthy" ]; then
    verde "     app saudável"
    break
  fi
  if [ "$i" = "30" ]; then
    echo "     app não ficou saudável em 60s. Últimas linhas do log:"
    docker compose logs --tail 40 financeops
    exit 1
  fi
  sleep 2
done

verde ""
verde "Atualizado. Backups em: docker volume inspect financeops-dados"
