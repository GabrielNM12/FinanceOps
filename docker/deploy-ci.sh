#!/usr/bin/env bash
#
# Deploy automático, chamado pelo GitHub Actions no runner self-hosted.
#
#     ./docker/deploy-ci.sh
#
# DIFERENÇA PARA O `atualizar.sh`:
# o `atualizar.sh` é para quando você está no SSH, olhando a saída. Este roda
# sozinho, sem ninguém para decidir o que fazer quando algo falha — então ele
# precisa decidir por conta própria, e a decisão é sempre voltar para a versão
# que estava no ar.
#
# O QUE ESTE SCRIPT NÃO FAZ:
# ele reverte o CÓDIGO, não o BANCO. Se a versão nova alterou o schema, o
# `prisma db push` já aplicou a mudança, e voltar o commit não desfaz isso. Por
# isso o backup do passo 1 não é opcional: ele é a única forma de desfazer uma
# alteração de dados. Alterações destrutivas de schema continuam merecendo um
# deploy assistido, no SSH.
set -euo pipefail

cd "$(dirname "$0")/.."

azul()  { printf '\033[36m%s\033[0m\n' "$1"; }
verde() { printf '\033[32m%s\033[0m\n' "$1"; }
vermelho() { printf '\033[31m%s\033[0m\n' "$1"; }

# Guardado ANTES do pull: é para cá que voltamos se o deploy falhar.
ANTERIOR="$(git rev-parse HEAD)"

esperar_saude() {
  for i in $(seq 1 45); do
    estado=$(docker inspect --format '{{.State.Health.Status}}' financeops 2>/dev/null || echo "starting")
    [ "$estado" = "healthy" ] && return 0
    # Um container que morreu não vai ficar saudável esperando mais. Falhar
    # rápido aqui devolve o log de erro enquanto ele ainda é relevante.
    if [ "$estado" = "unhealthy" ]; then
      sleep 2
      continue
    fi
    sleep 2
  done
  return 1
}

reverter() {
  vermelho ""
  vermelho "Deploy falhou. Voltando para ${ANTERIOR:0:7}."
  git reset --hard "$ANTERIOR"
  docker compose build
  docker compose up -d

  if esperar_saude; then
    verde "     revertido — a versão anterior está no ar"
  else
    vermelho "     A REVERSÃO TAMBÉM FALHOU. Entre no servidor:"
    vermelho "     cd ~/financeops && docker compose logs --tail 60 financeops"
  fi
  exit 1
}

azul "1/5  Backup antes de mexer"
if docker compose ps --status running --quiet financeops > /dev/null 2>&1; then
  docker compose exec -T financeops node scripts/backup-runtime.mjs \
    || echo "     (não consegui fazer backup — app pode estar subindo ainda)"
else
  echo "     (app parado — nada para salvar)"
fi

azul "2/5  Buscando a versão nova"
# `--ff-only` recusa merge automático: se o histórico da VPS divergiu (alguém
# editou um arquivo direto no servidor), é melhor falhar aqui do que resolver
# conflito sozinho.
git pull --ff-only
NOVO="$(git rev-parse HEAD)"

if [ "$NOVO" = "$ANTERIOR" ]; then
  verde "     nada novo — ${ANTERIOR:0:7} já está no ar"
  exit 0
fi
echo "     ${ANTERIOR:0:7} -> ${NOVO:0:7}"

azul "3/5  Reconstruindo a imagem"
docker compose build || reverter

azul "4/5  Subindo"
docker compose up -d || reverter

azul "5/5  Conferindo saúde"
if esperar_saude; then
  verde "     app saudável"
else
  echo "     app não ficou saudável em 90s. Últimas linhas do log:"
  docker compose logs --tail 40 financeops
  reverter
fi

# Imagens antigas se acumulam a cada build e enchem o disco da VPS em silêncio.
# `--filter until=168h` preserva uma semana, que é margem para voltar à mão.
docker image prune -f --filter "until=168h" > /dev/null 2>&1 || true

verde ""
verde "No ar: ${NOVO:0:7}"
