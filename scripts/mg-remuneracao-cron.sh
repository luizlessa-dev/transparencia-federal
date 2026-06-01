#!/usr/bin/env bash
# scripts/mg-remuneracao-cron.sh
#
# Ingestão mensal da remuneração do Executivo de MG (supersalários).
# Roda localmente no Mac (IP BR residencial) — o CKAN dados.mg.gov.br
# bloqueia IP de datacenter (403).
#
# Disparado pelo launchd no dia 8 de cada mês às 09:00 BRT (a folha do mês
# costuma ser publicada com alguns dias de defasagem).
#
# O job acha sozinho o CSV do mês mais recente, ingere e poda os meses antigos
# (mantém só o último snapshot — disco).
#
# Log: ~/Library/Logs/mg-remuneracao-cron.log

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_FILE="$HOME/Library/Logs/mg-remuneracao-cron.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

log "=== Iniciando ingestão MG remuneração ==="
cd "$REPO_DIR"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
  log "Variáveis de ambiente carregadas de .env"
fi

if npm run ingestao-mg:mensal 2>&1 | tee -a "$LOG_FILE"; then
  log "=== Ingestão MG remuneração concluída ==="
else
  log "ERRO na ingestão MG remuneração"
  exit 1
fi
