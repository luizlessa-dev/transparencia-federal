# 08 — Fase 1: Ingestão (implementação)

## Objetivo

Implementar o job `job_ingestao_emendas` que coleta emendas parlamentares do Portal da Transparência para 2023, 2024, 2025 e 2026, grava em `emendas_brutas`, atualiza `cobertura_dados` e registra execução em `execucoes_pipeline` e `execucoes_pipeline_etapas`.

## Estrutura criada

- **packages/ingestao/src/**
  - `types.ts` — Tipos (EmendaPortal, EmendaBrutaInsert, status)
  - `normalizers/` — parlamentar, partido, estado, valor
  - `validacao.ts` — Validação de registro (ano, id, parlamentar, valor)
  - `portal-client.ts` — Cliente da API do Portal (busca por ano, paginação)
  - `db.ts` — Acesso Supabase (execução, etapa, upsert emendas_brutas, cobertura)
  - `job-ingestao-emendas.ts` — Orquestração do job
  - `run.ts` — CLI (lê env, chama job, imprime resultado)

## Fluxo do job

1. Criar registro em `execucoes_pipeline` (job_nome, status em_andamento, detalhes com correlation_id).
2. Criar etapa em `execucoes_pipeline_etapas` (etapa_nome "ingestao_emendas").
3. Para cada ano (2023, 2024, 2025, 2026):
   - Chamar API do Portal para o ano.
   - Normalizar e validar cada item; ignorar inválidos (não interrompe).
   - Upsert em `emendas_brutas` por (ano, id_externo), em lotes.
   - Atualizar `cobertura_dados` (ano, status, total_registros, ultima_ingestao_em).
4. Atualizar etapa e execução (finalizado_em, status sucesso/erro, detalhes).

Status de cobertura: `dados_encontrados` | `vazio_na_fonte` | `erro_coleta`.

## Como testar

### Pré-requisitos

- Migration aplicada (tabelas existem no Supabase).
- Arquivo `.env` na raiz do repositório com:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `PORTAL_TRANSPARENCIA_API_KEY` (chave obtida em portaldatransparencia.gov.br/api-de-dados)

### Executar

Da raiz do monorepo:

```bash
npm run ingestao
```

Ou de dentro do pacote:

```bash
cd packages/ingestao && npm run ingestao:ts
```

### Verificações após a execução

1. **emendas_brutas:** `SELECT ano, COUNT(*) FROM emendas_brutas GROUP BY ano;`
2. **cobertura_dados:** `SELECT * FROM cobertura_dados ORDER BY ano;`
3. **execucoes_pipeline:** `SELECT id, job_nome, status, iniciado_em, finalizado_em FROM execucoes_pipeline ORDER BY iniciado_em DESC LIMIT 5;`
4. **execucoes_pipeline_etapas:** `SELECT * FROM execucoes_pipeline_etapas WHERE execucao_id = '<id_da_ultima_execucao>';`

### Resultados esperados por ano

- **2023 e 2024:** podem retornar dados (status `dados_encontrados`).
- **2025 e 2026:** podem retornar array vazio (status `vazio_na_fonte`) — não é erro.
- Qualquer ano com falha de rede ou API: status `erro_coleta`; execução continua para os demais anos.

## API do Portal

- Base URL: `https://api.portaldatransparencia.gov.br`
- Path: `/api-de-dados/emendas?ano=YYYY&pagina=N&tamanhoPagina=100`
- Header: `chave-api-dados: <PORTAL_TRANSPARENCIA_API_KEY>`
- Resposta: array de objetos ou objeto com propriedade `data`/`dados`/`lista`/`items`.

Se o endpoint ou o formato mudar, ajustar `portal-client.ts` (path, parâmetros, `asArray`).

## O que não foi implementado (fora do escopo da Fase 1)

- Enriquecimento financeiro
- Cálculo de ranking
- Publicação de ranking
- API pública
- Frontend
- Cache ou analytics
