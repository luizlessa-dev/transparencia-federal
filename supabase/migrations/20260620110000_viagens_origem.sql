-- Origem e destino por trecho (enriquecimento via Trecho.csv do Portal)
-- UF armazenada como sigla (RS, SP…); País preenchido em viagens internacionais.

ALTER TABLE viagens
  ADD COLUMN IF NOT EXISTS origem_municipio TEXT,
  ADD COLUMN IF NOT EXISTS origem_uf        TEXT,
  ADD COLUMN IF NOT EXISTS destino_pais     TEXT;

CREATE INDEX IF NOT EXISTS idx_viagens_origem_uf ON viagens (origem_uf);
