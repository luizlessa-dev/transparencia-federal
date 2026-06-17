# Auditoria — Ingestão BR Insider Federal

Data: 2026-06-16  
Escopo: 3 scripts de catch-up + diagnóstico CNPJ RFB  
Modo: read-only (nada foi executado, nada foi alterado).

---

## Resumo executivo

1. **`run-risco.ts` NÃO pode rodar como está.** Hardcoda `patrimonio_2022: null` (linha ~389) e `fornecedores_sancionados`/`doadores_sancionados` em zero. Como o job faz UPSERT em `cam_parlamentar_risco`, vai **sobrescrever com null** o que já está populado. Não existe job separado que preencha `patrimonio_2022` a partir de `tse_bens_agg` (o comentário inline "populado em etapa separada" parece nunca ter sido implementado). **Patchar antes de rodar.**
2. **`run-frentes-comissoes.ts` e `run-votacoes.ts` podem rodar como estão.** Ambos são UPSERT idempotente; o de votações tem `--data-inicio YYYY-MM-DD` para catch-up incremental sem reingerir tudo.
3. **`camara_voto` não existe** — destino real dos votos é `plen_votos` (+ `plen_votacoes` + `plen_orientacoes`).
4. **CNPJ RFB não está quebrado por design — está quebrado por PATH.** A arquitetura é deliberadamente *subset por universo* (2.691 CNPJs = união dos universos CVM+MG), NÃO full RFB. Cron mensal do dia 15 falhou com **exit 127 (`node: command not found`)** porque launchd não herda PATH do shell. Próximo ciclo agendado: 15/jul. Conserto trivial.
5. **Há um cron órfão queimando ciclo:** `com.brinsider.cnpj-bulk` (do outro repo `brasilia-insider`) tenta a cada hora um host RFB (`dadosabertos.rfb.gov.br`) que está **fora há ~72h**. Considerar matar até a RFB voltar.

**Correção factual ao briefing:** os packages são `@transparencia/analytics` e `@transparencia/ingestao-camara` (sem `-federal`). O script no `package.json` é `risco:ts`, não `risco`.

---

## Parte A — Scripts auditados

### A1. `packages/analytics/src/run-risco.ts`

- **Comando real:** `npm run risco:ts -w @transparencia/analytics`  
  (equivalente: `pnpm --filter @transparencia/analytics run risco:ts`)
- **Flags úteis:** **nenhuma**. Sem CLI parser, sem `process.argv`. Hardcoded: legislatura 57, ano CEAP 2024, ano TSE 2022, cargo TSE 6 (dep. federal).
- **Lê de:**
  - `plen_deputado_agg` (id_legislatura=57)
  - `cam_parlamentar_risco` (só pra reaproveitar CPF previamente enriquecido)
  - `ceaps_ranking` (ano=2024)
  - `tse_candidatos_receitas_agg` (cargo=6, ano=2022, paginado 1000/pg)
  - `cam_proposicoes_agg` (TODAS as linhas — **note: `_agg`**, não `cam_proposicoes`)
  - `emendas_completas` (tipo_emenda ilike `%individual%`)
- **Escreve em:** `cam_parlamentar_risco` — colunas: `deputado_id, nome, sigla_partido, sigla_uf, url_foto, cpf, score_total, dim_ceap, dim_presenca, dim_producao, dim_financiamento, dim_rp9, ceap_total_2024, passagens_aereas_2024, presenca_pct, concordancia_partido, total_proposicoes, total_substantivo, financiamento_total, financiamento_fefc, patrimonio_2022, fornecedores_sancionados, doadores_sancionados, atualizado_em`.
- **Comportamento:** **UPSERT** (`onConflict: deputado_id`, lotes de 100). Não trunca. Preserva colunas que ele não toca (`total_frentes`, `total_comissoes`, `total_legislaturas` etc., populadas por outros jobs).
- **Estimativa de duração:** ~30–90 segundos. ~513 deputados, paralelismo nas cargas, query mais cara é `emendas_completas` (pode ser ~50–200k linhas).
- **Riscos / observações:**
  - **GAP CRÍTICO:** linha ~389 hardcoda `patrimonio_2022: null` com comentário *"populado em etapa separada via tse_bens_agg"*. **NÃO existe** job em `packages/analytics/src/run-*.ts` que faça essa etapa separada. A coluna é consumida em `/web/app/risco/[id]`, `/dossie/[id]`, `/parlamentares/[id]` via `fmtBRL`. Rodar como está = zera patrimônio dos 513 deputados.
  - **GAP relacionado:** `fornecedores_sancionados` e `doadores_sancionados` também hardcoded `0`. Existe `run-doadores-sancionados.ts` à parte que precisa rodar separado (e provavelmente faz UPDATE pontual).
  - `total_proposicoes` / `total_substantivo` SÃO populados de `cam_proposicoes_agg` — se essa view/tabela estiver desatualizada, viram `null` mesmo assim.
  - Match TSE depende de `run-cpf-enrich.ts` ter rodado antes (fallback por nome).
  - Match emendas é só por nome normalizado, sem fallback por CPF (vulnerável a homônimo).
  - RPC `exec_sql` provavelmente não existe — sempre cai no caminho de cálculo em memória.
- **Recomendação:** **PATCHAR antes do rerun.** Adicionar bloco que leia `tse_bens_agg` (chave: cpf ou nome+ano=2022, somando `valor_total`) e popule `patrimonio_2022` no upsert. Antes do patch, rodar query de confirmação:

  ```bash
  curl -s "$SUPABASE_URL/rest/v1/cam_parlamentar_risco?select=count&patrimonio_2022=not.is.null" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Prefer: count=exact"
  ```

  Se vier > 0, há perda iminente. Se vier 0, a coluna já está toda nula e o rerun não regride nada — pode rodar e fazer o patch depois.

---

### A2. `packages/ingestao-camara/src/run-frentes-comissoes.ts`

- **Comando real:** `npm run frentes-comissoes:ts -w @transparencia/ingestao-camara`
- **Flags úteis:** **nenhuma**. Sem CLI parser. Hardcoded: `idLegislatura=57` (frentes), `codTipoOrgao=2` (comissões permanentes). **Não dá pra rodar só comissões ou só frentes, nem mudar legislatura, sem editar o arquivo.**
- **Lê de:** API Câmara `dadosabertos.camara.leg.br/api/v2`
  - `/frentes?idLegislatura=57` (paginado)
  - `/frentes/{id}/membros`
  - `/orgaos?codTipoOrgao=2`
  - `/orgaos/{id}/membros`  
  Throttle 150 ms entre chamadas, timeout 15 s.
- **Escreve em:**
  - `cam_frentes` (id, titulo, id_legislatura, atualizado_em)
  - `cam_frentes_membros` (frente_id, deputado_id, nome, sigla_partido, sigla_uf) — onConflict `frente_id,deputado_id`
  - `cam_comissoes` (id, sigla, nome, apelido, tipo_orgao, atualizado_em)
  - `cam_comissoes_membros` (comissao_id, deputado_id, nome, sigla_partido, sigla_uf, titulo, data_inicio, data_fim) — onConflict `comissao_id,deputado_id`
  - `cam_parlamentar_risco` UPDATE de `total_frentes` e `total_comissoes` (só pros deputados que aparecem na execução)
- **Comportamento:** **UPSERT** (não trunca). Deputado que não aparece nesta execução mantém contagem antiga (drift baixo, não zera).
- **Estimativa de duração:** **8–15 min.** ~319 frentes + 30 comissões = ~349 detail calls × ~500 ms cada (latência + throttle) ≈ 3 min de detalhes + listagem + ~500 UPDATEs row-by-row em `cam_parlamentar_risco`.
- **Riscos / observações:**
  - Rate limit Câmara: 150 ms = ~400/min. Limite documentado não é estrito; risco baixo.
  - `try/catch` no fetch **engole erros silenciosamente** (retorna `null`). Frente com erro de rede fica sem membros, sem retry, sem alerta.
  - Update row-by-row em `cam_parlamentar_risco` (sem batch) — se falhar no meio, contadores ficam parciais. Não é fatal.
  - Como não trunca, frentes/comissões que foram removidas da API permanecem como drift no banco (provavelmente OK pra histórico).
- **Recomendação:** **rodar como está.** Único cuidado: se a meta é cobertura *limpa* (sem drift), considerar TRUNCATE manual antes — mas isso quebra FKs. Pro catch-up, rodar direto resolve.

---

### A3. `packages/ingestao-camara/src/run-votacoes.ts`

- **Comando real:** `npm run votacoes:ts -w @transparencia/ingestao-camara` (wrapper CLI; lógica em `job-ingestao-votacoes.ts`).
- **Flags úteis:**
  - **`--data-inicio YYYY-MM-DD`** — só processa votações dessa data em diante. Default do client: `2023-02-01`. **Esta é a flag de catch-up.**
  - **`--forcar`** — reprocessa votações que já têm votos no DB (sem ela, faz skip por checagem em `plen_votos`).
- **Lê de:** API Câmara `/votacoes?siglaOrgao=PLEN&dataInicio=...` (paginado), `/votacoes/{id}/votos`, `/votacoes/{id}/orientacoes`. Throttle 300 ms.
- **Escreve em:**
  - `plen_votacoes` (onConflict `id`)
  - `plen_votos` (onConflict `votacao_id,deputado_id`, lotes de 200)
  - `plen_orientacoes` (onConflict `votacao_id,sigla_bancada`)
  - `execucoes` + `etapas` (telemetria)
- **DESTINO REAL = `plen_votos`** — `camara_voto` **não existe** em nenhum migration (grep confirmou zero matches em `supabase/migrations/`). Padrão é `plen_*` (alinha com `plen_deputado_agg`, `plen_votacoes`).
- **Comportamento:** **UPSERT resumível.** Lista votações da API, checa se já existem em `plen_votos` (lote `.in()` de 200 IDs), pula se sim e sem `--forcar`. Sem TRUNCATE em momento algum.
- **Estimativa de duração:**
  - Catch-up de ~50 votações novas: **2–4 min**.
  - Full 2023→hoje (~1500 votações) com cache frio: **40–60 min** (3 calls × 300 ms throttle × 1500).
- **Riscos / observações:**
  - Erro por votação capturado individualmente (`try/catch` no loop ~273) — não derruba job, mas vai pro `console.warn`.
  - Orientações são opcionais (silent fail).
  - Filtro `siglaOrgao=PLEN` aplicado **em código**, não na API — baixa votações de comissões também e descarta depois.
  - Skip por `plen_votos` checa qualquer voto na votação. Votação com cobertura parcial é pulada — use `--forcar` se desconfiar.
- **Recomendação:** **rodar como está**, com `--data-inicio` apropriada. Sugestão de comando para catch-up:

  ```bash
  # descobrir gap primeiro
  curl -s "$SUPABASE_URL/rest/v1/plen_votacoes?select=data&order=data.desc&limit=1" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"

  # depois usar essa data como --data-inicio
  npm run votacoes:ts -w @transparencia/ingestao-camara -- --data-inicio 2026-MM-DD
  ```

---

## Parte B — Diagnóstico CNPJ RFB

### Achados

- **launchd:** dois jobs distintos rodando em paralelo.
  1. **`com.thebrinsider.receita-qsa-mensal`** (do repo `transparencia-federal`) — calendar interval dia 15 às 09:00. **`LastExitStatus = 127`** (command not found). Executou 1 vez (15/jun/2026 09:00). Plist em `~/Library/LaunchAgents/com.thebrinsider.receita-qsa-mensal.plist`.
  2. **`com.brinsider.cnpj-bulk`** (do outro repo `brasilia-insider`) — interval 3600 s, **rodando agora** (PID 90507, runs=3, last exit code=1). Grava no banco do `brasilia-insider`, não no `transparencia-federal`.
- **Logs:**
  - `~/Library/Logs/receita-qsa-cron.log`: 2 linhas idênticas em 15/jun/2026 09:00 — `node: command not found`. Stderr vazio.
  - `/tmp/seed_cnpj_bulk_launchd.log` (do brasilia-insider): 100+ tentativas desde 14/jun, **todas** falhando com *"RFB inacessível"*. `dadosabertos.rfb.gov.br` está fora há ~72h.
- **Cron script `scripts/receita-qsa-cron.sh` (56 linhas):**
  - Faz `DELETE FROM cnpj_socios/cnpj_empresa` antes de reingerir (estratégia destrutiva + reidempotente).
  - Chama `npm run ingestao-cvm:receita`.
  - Sem cursor de resume — sempre reingere tudo do mês mais recente.
  - Sem timeout configurado.
  - Sem fallback de URL.
- **Tabela `cnpj_ingest_log`:** existe mas está **vazia (count=0)**. Job nunca escreveu nela.
- **Job real:** `packages/ingestao-cvm/src/job-receita.ts` + `run-receita.ts` (invocado via `npm run ingestao-cvm:receita` → `tsx src/run-receita.ts` com `NODE_OPTIONS=--max-old-space-size=4096`).
  - **Estratégia: filtro por universo.** Monta `Set<cnpj_basico>` a partir de `cvm_fundo`, `cvm_oferta`, `cvm_saf`, `mg_contratos`, `mg_licitacao_sobrepreco`, `mg_convenios`, `mg_empenhos_sancionados`, `mg_obras`, `mg_covid_compras`, `mg_terceirizados`, `mg_empresas_sancionadas`, `portal_sancionados`.
  - Baixa Socios0-9 + Empresas0-9 da RFB via **WebDAV Nextcloud** (`arquivos.receitafederal.gov.br`, NÃO o `dadosabertos.rfb.gov.br` que está fora).
  - Filtra linha-a-linha e só grava as que casam.
  - Modo único: full-replace mensal do subset.
- **Schema vs realidade:** `cnpj_empresa` tem **6 colunas** (`cnpj_basico, razao_social, natureza_juridica, capital_social, porte, atualizado_em`). **Não suporta full RFB** (faltam `data_inicio_atividade`, `municipio`, `uf`, `cnae_principal`, `situacao_cadastral`). **2.691 linhas = tamanho do universo de interesse, NÃO seed parcial.** Última atualização 05/jun/2026 (3 dias depois do bulk de 02/jun — possível rodada manual incremental, não há log pra confirmar).

### Diagnóstico

- **Estado real:** arquitetura está **correta** (subset deliberado, não full RFB) e funcionou em 02/jun. O cron mensal do dia 15 quebrou com exit 127 e ninguém viu — silencioso. Próximo ciclo só em 15/jul.
- **Causa raiz:** `scripts/receita-qsa-cron.sh` invoca `node` e `npm` direto sem exportar PATH. launchd só herda `PATH=/usr/bin:/bin:/usr/sbin:/sbin` — não enxerga `/opt/homebrew/opt/node@22/bin`.
- **Recomendação:** **NÃO rodar full seed RFB.** A arquitetura não foi feita pra isso (schema enxuto, estratégia de subset). Em vez disso:
  1. Consertar o cron (adicionar `export PATH=/opt/homebrew/opt/node@22/bin:$PATH` no início do `.sh`).
  2. Rodar o job manualmente uma vez agora pra cobrir o gap de 15 dias — leva poucos minutos.
  3. Considerar parar o cron `com.brinsider.cnpj-bulk` enquanto a RFB está fora — queima ciclo sem produzir nada.
- **Custo estimado:**
  - Full RFB completa (que **não é o caminho desse repo**): 10 GB download + 6–12h ingestão + ~30 GB no Supabase.
  - Subset atual (o caminho correto): ~10 min download + ~5 min filtragem, footprint poucos MB.

---

## Próximos passos recomendados (ordem)

1. **Confirmar perda iminente em `patrimonio_2022`** antes de tocar em `run-risco`. Query rápida no PostgREST (ver apêndice). Se a coluna já está toda nula, o rerun não regride nada.
2. **Decidir o patch do `run-risco`** (3 opções):
   - (a) Adicionar leitura de `tse_bens_agg` no `run-risco.ts` antes do upsert.
   - (b) Criar `run-patrimonio.ts` separado que rode depois do `run-risco` e faça UPDATE só dessa coluna.
   - (c) Mudar o upsert de `run-risco.ts` pra omitir `patrimonio_2022`/`fornecedores_sancionados`/`doadores_sancionados` da lista de colunas (mais seguro, preserva valores antigos).  
   Recomendação: **(c)** é o patch mínimo. **(a)** é o conserto correto.
3. **Rodar `run-frentes-comissoes`** — sem flag, ~10 min, sem risco.
4. **Rodar `run-votacoes` com `--data-inicio`** descoberta via query no `plen_votacoes` (apêndice).
5. **Consertar o cron CNPJ:** uma linha no shell script (`export PATH=...`). Depois rodar manualmente uma vez pra cobrir gap de 15 dias.
6. **Decidir destino do cron órfão** `com.brinsider.cnpj-bulk` (matar / esperar RFB voltar).

---

## Apêndice — Comandos recomendados (read-only para confirmar; demais para rodar quando autorizado)

```bash
# Carregar env
set -a && source /Users/luizlessa/transparencia-federal/.env && set +a
```

### Confirmar perda iminente em patrimonio_2022 (READ-ONLY)

```bash
curl -s "$SUPABASE_URL/rest/v1/cam_parlamentar_risco?select=count&patrimonio_2022=not.is.null" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Prefer: count=exact" -I
```

### Descobrir última votação no banco (READ-ONLY)

```bash
curl -s "$SUPABASE_URL/rest/v1/plen_votacoes?select=data&order=data.desc&limit=1" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

### Rodar jobs (quando autorizado)

```bash
# (1) Frentes + comissões — sem patch, ~10 min
npm run frentes-comissoes:ts -w @transparencia/ingestao-camara

# (2) Votações catch-up — substituir a data
npm run votacoes:ts -w @transparencia/ingestao-camara -- --data-inicio 2026-05-01

# (3) Risco — SÓ depois do patch da coluna patrimonio_2022
npm run risco:ts -w @transparencia/analytics
```

### Conserto do cron CNPJ (uma linha)

Adicionar como **primeira linha após o shebang** em `scripts/receita-qsa-cron.sh`:

```bash
export PATH="/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/bin:/bin"
```

### Rodar CNPJ manual pra cobrir o gap de 15 dias (quando autorizado)

```bash
cd /Users/luizlessa/transparencia-federal
npm run ingestao-cvm:receita
```

---

## Incertezas e perguntas pra você

1. **Patrimonio_2022 — quer que eu confirme via query antes de patchar?** Se já está toda nula, o `run-risco` pode rodar direto sem regressão.
2. **Cron órfão `com.brinsider.cnpj-bulk` (do outro repo) — mata?** Está queimando ciclo desde 14/jun batendo num host RFB fora do ar. Não afeta esse repo, mas é desperdício.
3. **Tabela `cnpj_ingest_log` existe vazia.** É dívida (job deveria logar e nunca chegou a implementar) ou tabela legada que pode ser dropada? Não tem nada gravando nela hoje.
4. **Universo de CNPJs é só CVM+MG.** Pra cruzar com fontes **federais** (TSE doadores, `emendas_favorecidos`, `tse_receitas`/`despesas`, sanções federais) o universo precisa **crescer**. Quer que eu mapeie quais tabelas faltam adicionar em `montarUniverso()`? Esse é o ganho real de alavanca pra investigação — muito mais do que rodar full RFB.
5. **`atualizado_em` mais nova em `cnpj_empresa` é 05/jun**, 3 dias depois do bulk (02/jun). Alguém rodou incremental manual? Sem log pra confirmar.
