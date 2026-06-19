#!/usr/bin/env bash
# scripts/camara-cron.sh
#
# Ingestão mensal da Câmara dos Deputados.
# Atualiza deputados, frentes parlamentares, comissões e score de risco.
#
# Disparado pelo launchd (com.thebrinsider.camara-mensal) no dia 6 às 10:00 BRT,
# após ALMG (dia 5 09h) e ALEPE (dia 5 11h).
#
# Log: ~/Library/Logs/camara-cron.log

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_FILE="$HOME/Library/Logs/camara-cron.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

log "=== Iniciando ingestão mensal Câmara ==="
cd "$REPO_DIR"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

log "Passo 1/3 — Deputados..."
if npm run ingestao-camara:ts -w @transparencia/ingestao-camara -- deputados 2>&1 | tee -a "$LOG_FILE"; then
  log "Deputados OK"
else
  log "ERRO em deputados — abortando"
  exit 1
fi

log "Passo 2/3 — Frentes parlamentares + Comissões..."
if npm run frentes-comissoes:ts -w @transparencia/ingestao-camara 2>&1 | tee -a "$LOG_FILE"; then
  log "Frentes/Comissões OK"
else
  log "ERRO em frentes/comissões"
  exit 1
fi

log "Passo 3/3 — Score de risco (G5)..."
if npm run risco:ts -w @transparencia/analytics 2>&1 | tee -a "$LOG_FILE"; then
  log "Score risco OK"
else
  log "AVISO: falha no score risco — dados ingeridos, só o score não atualizou"
fi

log "=== Ingestão Câmara concluída ==="
