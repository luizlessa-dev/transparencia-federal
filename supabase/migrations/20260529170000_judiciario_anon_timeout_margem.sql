-- ─────────────────────────────────────────────────────────────────────────
-- Margem extra no statement_timeout do anon: 8s → 12s (Fase 5, pós-deleção)
--
-- Busca ampla (ex. "recurso", 45k+ matches) roda 1,2–2,6s aquecida, mas uma
-- chamada fria (cache evictado / após autovacuum) pode encostar nos 8s e
-- estourar (57014). O conjunto cresce com o sync do canônico. 12s dá folga
-- contra cold-start sem mascarar problema real. anon é exclusivo do front
-- público do judiciário.
-- ─────────────────────────────────────────────────────────────────────────

ALTER ROLE anon SET statement_timeout = '12s';

NOTIFY pgrst, 'reload config';
