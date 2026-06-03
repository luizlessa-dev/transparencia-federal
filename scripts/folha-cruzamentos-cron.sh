#!/usr/bin/env bash
# Atualiza mensalmente os cruzamentos de folha de gabinete.
# Executado via launchd no dia 10 de cada mês (após a ingestão da folha no dia 5).
#
# O que faz:
#   1. folha-cruzamento  → leads de funcionários-doadores (Câmara)
#   2. folha-custo       → custo estimado do gabinete por deputado
#   3. folha-doador-senado → leads funcionários-doadores do Senado
#
# Logs em ~/Library/Logs/folha-cruzamentos-cron.log

set -euo pipefail

REPO="/Users/luizlessa/transparencia-federal"
LOG="$HOME/Library/Logs/folha-cruzamentos-cron.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"; }

log "=== folha-cruzamentos-cron iniciado ==="

cd "$REPO"

log "1/3 — cruzamento folha × doadores (Câmara)..."
npm run folha-cruzamento:ts -w @transparencia/analytics >> "$LOG" 2>&1 && log "OK" || log "ERRO no cruzamento"

log "2/3 — custo estimado dos gabinetes..."
npm run folha-custo:ts -w @transparencia/analytics >> "$LOG" 2>&1 && log "OK" || log "ERRO no custo"

log "3/3 — leads doadores do Senado..."
npm run folha-doador-senado:ts -w @transparencia/analytics >> "$LOG" 2>&1 && log "OK" || log "ERRO no senado"

log "=== folha-cruzamentos-cron concluído ==="
