#!/usr/bin/env bash
# scripts/scorecard-fed-refresh.sh
#
# Atualiza a materialized view mv_scorecard_fornecedor_federal.
# Usa CONCURRENTLY para não bloquear leituras durante o refresh.
#
# Disparado pelo launchd (com.thebrinsider.scorecard-fed-mensal)
# no 1º dia de cada mês às 03:00 BRT.
# Log: ~/Library/Logs/scorecard-fed-cron.log

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_FILE="$HOME/Library/Logs/scorecard-fed-cron.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

log "=== Iniciando refresh scorecard fornecedor federal ==="
cd "$REPO_DIR"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
  log "Variáveis de ambiente carregadas de .env"
fi

log "Executando REFRESH MATERIALIZED VIEW CONCURRENTLY..."
if echo "REFRESH MATERIALIZED VIEW CONCURRENTLY mv_scorecard_fornecedor_federal;" \
    | supabase db query --linked 2>&1 | tee -a "$LOG_FILE"; then
  log "=== Refresh concluído com sucesso ==="
else
  log "ERRO no refresh da materialized view"
  exit 1
fi
