#!/usr/bin/env bash
# scripts/dou-cron.sh
#
# Ingestão diária do DOU — Seções 2 (nomeações) e 3 (contratos) + cruzamento
# com assessores de gabinete e doadores de campanha.
#
# Disparado pelo launchd (com.thebrinsider.dou-diario) de seg a sex às 10:30 BRT.
# Log: ~/Library/Logs/dou-cron.log

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_FILE="$HOME/Library/Logs/dou-cron.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

log "=== Iniciando ingestão DOU ==="
cd "$REPO_DIR"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
  log "Variáveis de ambiente carregadas de .env"
fi

log "Buscando DO2 + DO3 do dia e executando cruzamento..."
if npm run --workspace=packages/ingestao-dou ingestao-dou:ts 2>&1 | tee -a "$LOG_FILE"; then
  log "=== Ingestão DOU concluída ==="
else
  log "ERRO na ingestão DOU"
  exit 1
fi
