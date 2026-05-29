-- ─────────────────────────────────────────────────────────────────────────
-- Aumenta statement_timeout do role anon de 3s → 8s (Fase 4/5 — perf do front)
--
-- A busca textual ampla (buscar_processos sem filtro de tribunal, ex. "recurso"
-- = 42k matches) leva 2,7–3,5s por causa do count(*) OVER() + ts_rank sort sobre
-- todo o conjunto. O default do role `anon` no Supabase é statement_timeout=3s,
-- então essas buscas estouravam de forma intermitente (57014) no front live.
--
-- O role `anon` no projeto canônico é usado EXCLUSIVAMENTE pelo front Vite
-- público do Observatório Judiciário (o app BR Insider em packages/web usa
-- service_role, não anon). Alinhar anon com authenticated/authenticator (8s)
-- dá folga sobre os ~3s sem afetar o resto do monorepo.
--
-- O projeto legado corklqwtrblervixxtan tinha timeout maior — isto restaura
-- paridade de comportamento pós-cutover.
-- ─────────────────────────────────────────────────────────────────────────

ALTER ROLE anon SET statement_timeout = '8s';

-- Recarrega o PostgREST pra aplicar nas conexões do pool.
NOTIFY pgrst, 'reload config';
