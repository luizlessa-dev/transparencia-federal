#!/usr/bin/env bash
# scripts/cda-cron.sh
#
# Atualização mensal das arestas fundo→fundo da CDA (CVM).
# A CVM não bloqueia IP de datacenter, então pode rodar em qualquer ambiente;
# mantemos no Mac por consistência com os demais crons do projeto.
#
# O job acha sozinho o mês mais recente com ZIP > 1MB, baixa, ingere e
# substitui as arestas antigas (TRUNCATE + reingest — tabela é replace total,
# não acumulativa, por isso não cresce com o tempo).
#
# Disparado pelo launchd no dia 10 de cada mês às 10:00 BRT.
# (CDA costuma sair com ~5 dias de lag após o fim do mês; dia 10 garante folga.)
#
# Log: ~/Library/Logs/cda-cron.log

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_FILE="$HOME/Library/Logs/cda-cron.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

log "=== Iniciando atualização CDA (arestas fundo→fundo) ==="
cd "$REPO_DIR"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

# Trunca as arestas do mês anterior antes de reinserir
# (a CDA é replace total — manter arestas antigas distorce o grafo)
node -e "
require('dotenv').config();
const {createClient}=require('@supabase/supabase-js');
const c=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
c.from('cvm_carteira_edge').delete().gte('cnpj_fundo','0')
  .then(r=>{ if(r.error) throw new Error(r.error.message); console.log('cvm_carteira_edge limpa'); });
" 2>&1 | tee -a "$LOG_FILE"

if npm run ingestao-cvm:cda 2>&1 | tee -a "$LOG_FILE"; then
  log "=== CDA atualizada com sucesso ==="
else
  log "ERRO na atualização da CDA"
  exit 1
fi
