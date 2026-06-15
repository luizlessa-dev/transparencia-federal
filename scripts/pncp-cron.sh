#!/usr/bin/env bash
# scripts/pncp-cron.sh
#
# Ingestão diária do PNCP — licitações publicadas no dia anterior.
# Modalidades 1,3,4,6,8 (pregão elet, dispensa elet, concorrência elet,
# leilão eletrônico, concurso). Cobertura: federal + estadual + municipal.
#
# Disparado pelo launchd (com.thebrinsider.pncp-diario) de seg a sex às 08:00 BRT.
# Log: ~/Library/Logs/pncp-cron.log

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_FILE="$HOME/Library/Logs/pncp-cron.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

log "=== Iniciando ingestão PNCP ==="
cd "$REPO_DIR"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

# Calcula data de ontem
ONTEM=$(date -v-1d '+%Y-%m-%d' 2>/dev/null || date -d 'yesterday' '+%Y-%m-%d')
log "Data alvo: $ONTEM"

if npm run --workspace=packages/ingestao-pncp pncp:ts -- --data="$ONTEM" --modalidades=1,3,4,6,8 2>&1 | tee -a "$LOG_FILE"; then
  log "=== Ingestão PNCP concluída ==="
else
  log "ERRO na ingestão PNCP"
  exit 1
fi
