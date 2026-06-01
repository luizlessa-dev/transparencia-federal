-- ─────────────────────────────────────────────────────────────────────────
-- mg_empenhos_sancionados: a UNIQUE (ano, numero_empenho, orgao) colapsaria
-- linhas caso o arquivo de empenho traga mais de uma linha por nota (elemento/
-- item/fonte distintos) → subcontagem dos pagamentos. Troca por hash md5
-- granular (preserva cada linha-fonte; re-ingestão idempotente).
-- ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT conname FROM pg_constraint
    WHERE conrelid = 'mg_empenhos_sancionados'::regclass AND contype = 'u'
  LOOP
    EXECUTE 'ALTER TABLE mg_empenhos_sancionados DROP CONSTRAINT ' || quote_ident(r.conname);
  END LOOP;
END $$;

ALTER TABLE mg_empenhos_sancionados ADD COLUMN IF NOT EXISTS dedupe_key text
  GENERATED ALWAYS AS (
    md5(
      coalesce(ano::text, '') || '|' || coalesce(numero_empenho, '') || '|' ||
      coalesce(orgao, '') || '|' || coalesce(elemento_despesa, '') || '|' ||
      coalesce(fonte_recurso, '') || '|' || coalesce(numero_processo, '') || '|' ||
      coalesce(valor_empenhado::text, '') || '|' || coalesce(valor_liquidado::text, '') || '|' ||
      coalesce(valor_pago::text, '')
    )
  ) STORED;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mg_empenhos_dedupe ON mg_empenhos_sancionados (dedupe_key);
