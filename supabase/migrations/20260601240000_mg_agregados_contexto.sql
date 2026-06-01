-- ─────────────────────────────────────────────────────────────────────────
-- Agregados de contexto MG (sem favorecidos — favorecido é anonimizado na
-- fonte). Somatórios por órgão/tipo e ano, a partir das tabelas-fato do CKAN.
--   • mg_diarias_orgao — gasto com diárias por unidade orçamentária e ano.
--   • mg_restos_orgao  — restos a pagar (inscrito/pago/saldo) por órgão e ano.
--   • mg_divida_tipo   — serviço da dívida (juros + amortização) por tipo e ano.
-- Fonte CKAN CC-BY-4.0. Chave de negócio = código estável da unidade (cd_*).
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mg_diarias_orgao (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ano             int NOT NULL,
  cd_unidade_orc  int,
  orgao           text,
  sigla           text,
  vr_empenhado    numeric(18,2),
  vr_liquidado    numeric(18,2),
  vr_pago         numeric(18,2),
  qtd_registros   int,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (ano, cd_unidade_orc)
);
CREATE INDEX IF NOT EXISTS idx_mg_diarias_orgao_ano ON mg_diarias_orgao (ano);

CREATE TABLE IF NOT EXISTS mg_restos_orgao (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ano                int NOT NULL,
  cd_unidade_orc     int,
  orgao              text,
  sigla              text,
  vr_nao_processado  numeric(18,2),
  vr_processado      numeric(18,2),
  vr_pago            numeric(18,2),
  vr_inscrito        numeric(18,2) GENERATED ALWAYS AS
                       (coalesce(vr_nao_processado, 0) + coalesce(vr_processado, 0)) STORED,
  qtd_registros      int,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (ano, cd_unidade_orc)
);
CREATE INDEX IF NOT EXISTS idx_mg_restos_orgao_ano ON mg_restos_orgao (ano);

CREATE TABLE IF NOT EXISTS mg_divida_tipo (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ano             int NOT NULL,
  cd_tipo         int,
  tipo            text,
  vr_juros        numeric(18,2),
  vr_amortizacao  numeric(18,2),
  vr_total        numeric(18,2) GENERATED ALWAYS AS
                    (coalesce(vr_juros, 0) + coalesce(vr_amortizacao, 0)) STORED,
  qtd_registros   int,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (ano, cd_tipo)
);
CREATE INDEX IF NOT EXISTS idx_mg_divida_tipo_ano ON mg_divida_tipo (ano);

COMMENT ON TABLE mg_diarias_orgao IS 'Diárias por unidade orçamentária e ano (agregado), Executivo MG. CKAN.';
COMMENT ON TABLE mg_restos_orgao IS 'Restos a pagar por órgão e ano (inscrito/pago/saldo), Executivo MG. CKAN.';
COMMENT ON TABLE mg_divida_tipo IS 'Serviço da dívida (juros+amortização) por tipo e ano, Executivo MG. CKAN.';
