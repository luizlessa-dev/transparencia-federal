#!/usr/bin/env bash
# scripts/almg-cron.sh
#
# Ingestão mensal ALMG — roda localmente no Mac (IP BR residencial).
# Disparado pelo launchd no dia 5 de cada mês às 09:00 BRT.
#
# Por que local e não GitHub Actions:
#   O portal da ALMG bloqueia IPs de datacenter (Azure, Cloudflare).
#   IP residencial BR passa sem restrição.
#
# Log: ~/Library/Logs/almg-cron.log

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_FILE="$HOME/Library/Logs/almg-cron.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

log "=== Iniciando ingestão ALMG ==="
cd "$REPO_DIR"

# Carrega .env da raiz
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
  log "Variáveis de ambiente carregadas de .env"
fi

# Calcula mês anterior (mesma lógica do workflow GHA)
CURRENT_MES=$(date +%-m)
CURRENT_ANO=$(date +%Y)
if [ "$CURRENT_MES" -eq 1 ]; then
  MES=12
  ANO=$((CURRENT_ANO - 1))
else
  MES=$((CURRENT_MES - 1))
  ANO=$CURRENT_ANO
fi

log "Período alvo: $(printf '%02d' "$MES")/$ANO"

# Passo 1: atualizar lista de deputados
log "Atualizando lista de deputados..."
if npm run ingestao-almg:deputados 2>&1 | tee -a "$LOG_FILE"; then
  log "Lista de deputados atualizada com sucesso"
else
  log "ERRO na atualização de deputados — abortando"
  exit 1
fi

# Passo 2: ingerir verba do mês anterior
log "Ingerindo verba indenizatória $MES/$ANO..."
if npm run ingestao-almg -- "$MES" "$ANO" 2>&1 | tee -a "$LOG_FILE"; then
  log "Ingestão $MES/$ANO concluída"
else
  log "ERRO na ingestão de verba $MES/$ANO"
  exit 1
fi

log "=== Ingestão ALMG concluída ==="
