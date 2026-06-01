-- ─────────────────────────────────────────────────────────────────────────
-- Doações e comodatos ao Estado de MG ("Selo Amigo", Casa Civil). Flat.
-- Quem doa o quê para qual órgão. Valor vem em FAIXA (categoria_valor), não
-- exato; sem CNPJ do doador. Fonte CKAN CC-BY-4.0.
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mg_doacoes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_instrumento  text,
  ano               int,
  mes               int,
  categoria_valor   text,                 -- faixa, ex: "Entre 100 k e 500k"
  orgao_recebedor   text,
  natureza_doador   text,                 -- Privado / Público
  doador            text,
  objeto            text,
  quantidade        text,
  vigencia          text,
  recurso_tj_mp     text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (doador, objeto, orgao_recebedor, ano, mes)
);
CREATE INDEX IF NOT EXISTS idx_mg_doacoes_orgao ON mg_doacoes (orgao_recebedor);

COMMENT ON TABLE mg_doacoes IS
  'Doações e comodatos ao Estado de MG (Casa Civil). Valor em faixa, sem CNPJ do doador.';
