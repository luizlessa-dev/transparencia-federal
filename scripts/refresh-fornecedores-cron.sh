#!/usr/bin/env bash
# scripts/refresh-fornecedores-cron.sh
#
# Atualiza as materialized views de cruzamento de fornecedores estaduais.
# Roda localmente porque o statement_timeout do Supabase (25s) não pode ser
# sobrescrito via PostgREST/RPC — a query agrega 4M+ linhas e leva ~60-90s.
#
# MVs atualizadas:
#   - fornecedores_intersetados  (ALEPE × Câmara × ALESP)
#   - almg_fornecedores_intersetados (ALMG × Câmara × ALESP)
#
# Disparado pelo launchd (com.thebrinsider.fornecedores-mensal) no dia 7 às 10:00 BRT,
# após as ingestões de ALEPE (dia 5) e ALESP (dia 5).
# Log: ~/Library/Logs/refresh-fornecedores-cron.log

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_FILE="$HOME/Library/Logs/refresh-fornecedores-cron.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

log "=== Iniciando refresh fornecedores intersetados ==="
cd "$REPO_DIR"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

log "Refreshing fornecedores_intersetados..."
if supabase db query --linked \
  "REFRESH MATERIALIZED VIEW CONCURRENTLY public.fornecedores_intersetados;" \
  >> "$LOG_FILE" 2>&1; then
  log "✅ fornecedores_intersetados OK"
else
  log "❌ Erro em fornecedores_intersetados"
fi

log "Refreshing almg_fornecedores_intersetados..."
if supabase db query --linked \
  "REFRESH MATERIALIZED VIEW CONCURRENTLY public.almg_fornecedores_intersetados;" \
  >> "$LOG_FILE" 2>&1; then
  log "✅ almg_fornecedores_intersetados OK"
else
  log "❌ Erro em almg_fornecedores_intersetados"
fi

log "=== Refresh concluído ==="
