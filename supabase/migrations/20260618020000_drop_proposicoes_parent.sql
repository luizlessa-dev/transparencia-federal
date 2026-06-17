-- Drop da tabela parent `proposicoes` (10.323 linhas, órfã).
--
-- Sucedida por `cam_proposicoes` (237 k linhas, populada pelo job
-- packages/ingestao-camara/src/job-ingestao-proposicoes.ts). A filha
-- `proposicoes_autores` já foi droppada em 20260618000000.
--
-- Auditoria 2026-06-17:
--  - 0 referências em código (`packages/`, `scripts/`, `supabase/migrations/`)
--  - 0 dependentes via pg_rewrite (`pg_depend`)
--  - 0 foreign keys apontando pra esta tabela
--  - Última gravação muito anterior à introdução de `cam_proposicoes`

DROP TABLE IF EXISTS public.proposicoes;
