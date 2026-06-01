-- ─────────────────────────────────────────────────────────────────────────
-- Reparação Vale / Brumadinho — iniciativas do acordo judicial (SEPLAG).
-- "Para onde vai o dinheiro do acordo." Flat. Fonte CKAN CC-BY-4.0.
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mg_reparacao_vale (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_iniciativa  text,
  iniciativa         text,
  anexo              text,
  valor              numeric(18, 2),
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (codigo_iniciativa)
);

COMMENT ON TABLE mg_reparacao_vale IS
  'Iniciativas e valores do acordo judicial de reparação Vale/Brumadinho (SEPLAG-MG).';
