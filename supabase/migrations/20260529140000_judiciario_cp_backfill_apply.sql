-- ─────────────────────────────────────────────────────────────────────────
-- Aplica o backfill de classe_processual e remove o staging (Fase 5)
--
-- Staging _judiciario_cp_backfill foi carregado com 193.264 pares
-- (id, classe_processual) lidos do legado. Overlap com rows que já tinham
-- metadata.classe_codigo no canônico = 0 (conjuntos disjuntos), então o UPDATE
-- é puramente aditivo: preenche ~190k rows onde classe_codigo estava NULL.
-- Os ~3k pares sem match correspondem às linhas consolidadas na dedup da Fase 2.
--
-- A view processos/processos_publico e o RPC buscar_processos já leem
-- classe_processual de metadata->>'classe_codigo' — nenhuma mudança neles.
-- ─────────────────────────────────────────────────────────────────────────

UPDATE public.judiciario_processos p
SET metadata = COALESCE(p.metadata, '{}'::jsonb)
             || jsonb_build_object('classe_codigo', s.classe_processual)
FROM public._judiciario_cp_backfill s
WHERE p.id = s.id
  AND (p.metadata->>'classe_codigo') IS NULL
  AND s.classe_processual IS NOT NULL;

DROP TABLE IF EXISTS public._judiciario_cp_backfill;

NOTIFY pgrst, 'reload config';
