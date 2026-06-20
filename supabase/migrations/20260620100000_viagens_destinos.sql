-- Destino estruturado de viagens (enriquecimento via CSV bulk do Portal)
-- Os campos /trechos da API são bloqueados (403 CloudFront) — fonte única é o CSV mensal.
-- Enriquecimento feito por scripts/viagens-enrich-csv.py usando PCDP como chave de join.

ALTER TABLE viagens
  ADD COLUMN IF NOT EXISTS destinos          TEXT,      -- raw: "BRASÍLIA/DF - SÃO PAULO/SP"
  ADD COLUMN IF NOT EXISTS destino_municipio TEXT,      -- primeiro destino: "BRASÍLIA"
  ADD COLUMN IF NOT EXISTS destino_uf        TEXT;      -- UF do primeiro destino: "DF"

CREATE INDEX IF NOT EXISTS idx_viagens_pcdp       ON viagens (pcdp);
CREATE INDEX IF NOT EXISTS idx_viagens_destino_uf ON viagens (destino_uf);
