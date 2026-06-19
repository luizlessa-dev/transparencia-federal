#!/usr/bin/env bash
# scripts/alepe-cron.sh
#
# Ingestão mensal ALEPE — roda localmente no Mac (IP BR residencial).
# Disparado pelo launchd no dia 5 de cada mês às 11:00 BRT (após ALMG 09h).
#
# Por que local e não GitHub Actions:
#   A API PHP da ALEPE bloqueia IPs de datacenter (Azure/GitHub Actions).
#   IP residencial BR passa sem restrição.
#
# Log: ~/Library/Logs/alepe-cron.log

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_FILE="$HOME/Library/Logs/alepe-cron.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

log "=== Iniciando ingestão ALEPE ==="
cd "$REPO_DIR"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

# Mês anterior + mês corrente (mesma lógica do workflow GHA)
CURRENT_MES=$(date +%-m)
CURRENT_ANO=$(date +%Y)
if [ "$CURRENT_MES" -eq 1 ]; then
  MESES="1"
else
  PREV_MES=$((CURRENT_MES - 1))
  MESES="$PREV_MES $CURRENT_MES"
fi

log "Período alvo: $CURRENT_ANO meses=[$MESES]"

log "Atualizando lista de deputados..."
if npm run ingestao-alepe:deputados 2>&1 | tee -a "$LOG_FILE"; then
  log "Lista de deputados atualizada"
else
  log "AVISO: falha ao atualizar deputados — continuando com ingestão de despesas"
fi

log "Ingerindo despesas $CURRENT_ANO meses [$MESES]..."
if npm run ingestao-alepe -- "$CURRENT_ANO" $MESES 2>&1 | tee -a "$LOG_FILE"; then
  log "Ingestão ALEPE concluída"
else
  log "ERRO na ingestão ALEPE"
  exit 1
fi

log "=== Ingestão ALEPE concluída ==="
