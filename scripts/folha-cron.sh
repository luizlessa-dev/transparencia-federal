#!/usr/bin/env bash
# scripts/folha-cron.sh
#
# Ingestão mensal da folha de gabinete federal (Fase 1 — sem salário).
# Snapshot mensal de quem trabalha em qual gabinete:
#   - Câmara: secretários parlamentares
#   - Senado: comissionados de gabinete (GABSEN)
#
# Disparado pelo launchd (com.thebrinsider.folha-mensal) no dia 5 às 09:00 BRT.
# Roda local (IP residencial BR) como os demais jobs.
#
# Log: ~/Library/Logs/folha-cron.log

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_FILE="$HOME/Library/Logs/folha-cron.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

log "=== Iniciando ingestão folha de gabinete ==="
cd "$REPO_DIR"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
  log "Variáveis de ambiente carregadas de .env"
fi

log "Câmara — secretários parlamentares..."
if npm run ingestao-folha:camara 2>&1 | tee -a "$LOG_FILE"; then
  log "Câmara concluída"
else
  log "ERRO na ingestão da Câmara"
  exit 1
fi

log "Senado — comissionados de gabinete..."
if npm run ingestao-folha:senado 2>&1 | tee -a "$LOG_FILE"; then
  log "Senado concluída"
else
  log "ERRO na ingestão do Senado"
  exit 1
fi

log "=== Ingestão folha de gabinete concluída ==="
