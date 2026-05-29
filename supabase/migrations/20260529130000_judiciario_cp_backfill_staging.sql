-- ─────────────────────────────────────────────────────────────────────────
-- Staging para backfill de classe_processual (Fase 5 — pré-decommission)
--
-- A migração de Fase 2 carregou classe_processual (como metadata.classe_codigo)
-- só em 77.832 rows, mas o legado corklqwtrblervixxtan tinha em 193.264. Antes
-- de deletar o legado, restauramos os ~115k valores faltantes no canônico.
--
-- Esta tabela recebe (id, classe_processual) lidos do legado via script
-- (service_role). O UPDATE final + DROP ficam na migration de aplicação.
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public._judiciario_cp_backfill (
  id                UUID PRIMARY KEY,
  classe_processual TEXT
);

-- Sem RLS: tabela efêmera de manutenção, acessada só por service_role.
GRANT ALL ON public._judiciario_cp_backfill TO service_role;

NOTIFY pgrst, 'reload config';
