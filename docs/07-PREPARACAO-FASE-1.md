# 07 — Preparação para a Fase 1 (Ingestão)

Documento de transição: o que já está pronto e o que fazer em seguida.

---

## O que já está pronto para iniciar job_ingestao_emendas

- **Estrutura de pastas:** repositório com `packages/ingestao`, `supabase/migrations`, `docs`, `scripts`.
- **Schema e migration:** as 9 tabelas mínimas criadas na migration `20250313120000_initial_schema.sql`, na ordem correta de FK.
- **Tabelas usadas na Fase 1:**
  - `emendas_brutas` — destino dos dados da API do Portal da Transparência (upsert por `ano` + `id_externo`).
  - `cobertura_dados` — atualização de ano, `ultima_ingestao_em`, `status`, `total_registros`.
  - `execucoes_pipeline` — registro de cada execução do job.
  - `execucoes_pipeline_etapas` — etapas (ex.: uma etapa por ano ingerido).
- **Variáveis de ambiente:** `.env.example` com `PORTAL_TRANSPARENCIA_API_KEY` e Supabase; copiar para `.env` e preencher.
- **Documentação:** modelo de dados consolidado em `02-MODELO-DADOS.md`; blueprint e políticas em `docs/`.

---

## O que ainda NÃO deve ser implementado nesta etapa

- **Enriquecimento:** nenhum código em `packages/enriquecimento` além da estrutura vazia.
- **Analytics:** nenhum código em `packages/analytics`; não preencher `ranking_parlamentar_build` nem `snapshots_ranking`.
- **API pública:** nenhum endpoint em `packages/api`; não expor ranking nem tabelas brutas.
- **Frontend:** nenhuma página final em `packages/web`; não consumir dados ainda.
- **Job de publicação:** não implementar `job_publicar_ranking`; não escrever em `ranking_parlamentar`.

---

## Validações antes de considerar a Fase 1 iniciada

1. **Migration aplicada:** rodar a migration no banco (Supabase local ou remoto) e confirmar que as 9 tabelas existem sem erro de FK.
2. **Ambiente:** `.env` configurado com `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `PORTAL_TRANSPARENCIA_API_KEY` (secret seguro).
3. **Contrato da API:** confirmar endpoint e formato do Portal da Transparência para 2023/2024 (já validado no blueprint).
4. **Escopo da Fase 1:** implementar apenas o job de ingestão que escreve em `emendas_brutas`, atualiza `cobertura_dados` e registra em `execucoes_pipeline` e `execucoes_pipeline_etapas`; validar com dados reais antes de avançar para Fase 2.

---

## Próximo passo exato

1. Aplicar a migration: `supabase db push` ou `supabase migration up` (conforme setup do projeto).
2. Implementar, em `packages/ingestao`, o **job_ingestao_emendas**: chamada à API do Portal (com API key do env), persistência em `emendas_brutas` (upsert por ano + id_externo), atualização de `cobertura_dados` e registro em `execucoes_pipeline` / `execucoes_pipeline_etapas`.
3. Validar: executar o job para 2023 e 2024 e conferir linhas em `emendas_brutas` e em `cobertura_dados`.
