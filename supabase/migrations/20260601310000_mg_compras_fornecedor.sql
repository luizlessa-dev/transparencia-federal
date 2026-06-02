-- ─────────────────────────────────────────────────────────────────────────
-- Compras (SIAD) agregadas por FORNECEDOR e ano — Executivo de MG.
-- Universo de compras do sistema SIAD (mais amplo que o Portal de Contratos),
-- com o contratado nomeado por CNPJ (PJ não é anonimizada na fonte; só CPF/PF).
-- Reduzido a 1 linha por contrato (sem dupla contagem de snapshots da fato) e
-- somado por CNPJ+ano. Combustível para o scorecard de fornecedor. CKAN.
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mg_compras_fornecedor (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj_norm       text,
  nome            text,
  ano             int,
  n_contratos     int,
  vr_homologado   numeric(18,2),
  vr_atualizado   numeric(18,2),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (cnpj_norm, ano)
);
CREATE INDEX IF NOT EXISTS idx_mg_compras_forn_cnpj ON mg_compras_fornecedor (cnpj_norm);
CREATE INDEX IF NOT EXISTS idx_mg_compras_forn_ano ON mg_compras_fornecedor (ano);

COMMENT ON TABLE mg_compras_fornecedor IS
  'Compras SIAD por fornecedor (CNPJ) e ano — total contratado homologado/atualizado, nº de contratos. 1 linha por contrato reduzida. CKAN.';
