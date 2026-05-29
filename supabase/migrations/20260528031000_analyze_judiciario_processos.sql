-- ─────────────────────────────────────────────────────────────────────────
-- ANALYZE pós-bulk em judiciario_processos (Fase 4 — perf do cutover)
--
-- Os ~291k rows foram carregados via bulk upsert (run-migrate-judiciario.ts)
-- sem ANALYZE explícito. Sem estatísticas sobre a coluna `search_vector`
-- (tsvector), o planner superestima a seletividade de `@@ websearch_to_tsquery`
-- e escolhe seq scan em vez do índice GIN `idx_jud_proc_fts` — busca textual
-- ampla (sem filtro de tribunal) levava ~5s e estourava o statement_timeout
-- do role anon.
--
-- ANALYZE recompõe as estatísticas (inclui as do GIN/tsvector), restaurando
-- o uso do índice. Idempotente e barato.
-- ─────────────────────────────────────────────────────────────────────────

ANALYZE public.judiciario_processos;
