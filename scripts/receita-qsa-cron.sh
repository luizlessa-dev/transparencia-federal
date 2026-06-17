#!/usr/bin/env bash
export PATH="/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/bin:/bin"
# scripts/receita-qsa-cron.sh
#
# Atualização mensal do QSA da Receita Federal (cnpj_socios + cnpj_empresa).
# Roda do Mac (IP residencial) pois dadosabertos.rfb.gov.br está instável —
# usamos o WebDAV do share público Nextcloud (arquivos.receitafederal.gov.br).
#
# Estratégia enxuta: não grava a base inteira (25M sócios / 60GB).
# Monta o universo de CNPJs do banco (contratantes MG, emissores CVM,
# sancionadas) e filtra só as linhas relevantes.
#
# Disparado no dia 15 de cada mês às 09:00 BRT.
# (A Receita publica o bulk no início do mês; dia 15 garante folga.)
#
# Log: ~/Library/Logs/receita-qsa-cron.log

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_FILE="$HOME/Library/Logs/receita-qsa-cron.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

log "=== Iniciando atualização QSA Receita Federal ==="
cd "$REPO_DIR"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

# Limpa dados anteriores antes de reinserir com o universo mais recente
node -e "
require('dotenv').config();
const {createClient}=require('@supabase/supabase-js');
const c=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
Promise.all([
  c.from('cnpj_socios').delete().gte('cnpj_basico','0'),
  c.from('cnpj_empresa').delete().gte('cnpj_basico','0')
]).then(([s,e])=>{
  if(s.error) throw new Error('socios: '+s.error.message);
  if(e.error) throw new Error('empresa: '+e.error.message);
  console.log('tabelas QSA limpas');
});
" 2>&1 | tee -a "$LOG_FILE"

# Ingesta completa (0-9) do mês mais recente disponível
if npm run ingestao-cvm:receita 2>&1 | tee -a "$LOG_FILE"; then
  log "=== QSA Receita atualizado com sucesso ==="
else
  log "ERRO na atualização do QSA"
  exit 1
fi
