-- ─────────────────────────────────────────────────────────────────────────
-- Fix mg_doacoes: a UNIQUE (doador, objeto, orgao_recebedor, ano, mes) incluía
-- `objeto` (texto descritivo longo) → linha do índice btree estourava o limite
-- de 2704 bytes. Troca por hash md5 das mesmas chaves (tamanho fixo).
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE mg_doacoes
  DROP CONSTRAINT IF EXISTS mg_doacoes_doador_objeto_orgao_recebedor_ano_mes_key;

ALTER TABLE mg_doacoes ADD COLUMN IF NOT EXISTS dedupe_key text
  GENERATED ALWAYS AS (
    md5(
      coalesce(doador, '') || '|' || coalesce(objeto, '') || '|' ||
      coalesce(orgao_recebedor, '') || '|' || coalesce(ano::text, '') || '|' ||
      coalesce(mes::text, '')
    )
  ) STORED;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mg_doacoes_dedupe ON mg_doacoes (dedupe_key);
