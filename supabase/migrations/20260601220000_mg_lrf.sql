-- ─────────────────────────────────────────────────────────────────────────
-- Lei de Responsabilidade Fiscal (LRF) — despesa com pessoal do Executivo MG.
-- Dois recortes da CGE/Tesouro:
--   • mg_lrf_pessoal  — despesa de pessoal mês a mês (bruta, ativos, inativos,
--                       terceirizações, líquida).
--   • mg_lrf_limites  — janela móvel de 12 meses: RCL ajustada, DTP (Despesa
--                       Total com Pessoal) e os limites legais (máximo 49% p/
--                       o Executivo, prudencial 46,55%, alerta 44,1%).
-- Agregado de contexto — sem favorecidos, só macro fiscal. Fonte CKAN CC-BY-4.0.
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mg_lrf_pessoal (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mes_ano          text NOT NULL,          -- "jan-22"
  ano              int,
  mes              int,
  despesa_bruta    numeric(18,2),
  pessoal_ativo    numeric(18,2),
  pessoal_inativo  numeric(18,2),
  terceirizacoes   numeric(18,2),
  despesa_liquida  numeric(18,2),
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mes_ano)
);
CREATE INDEX IF NOT EXISTS idx_mg_lrf_pessoal_ord ON mg_lrf_pessoal (ano, mes);

CREATE TABLE IF NOT EXISTS mg_lrf_limites (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo            text NOT NULL,        -- "jan_2025_a_dez_2025"
  ano_ref            int,                  -- ano final da janela (2025)
  rcl                numeric(18,2),
  rcl_ajustada       numeric(18,2),
  dtp                numeric(18,2),        -- Despesa Total com Pessoal
  limite_maximo      numeric(18,2),
  limite_prudencial  numeric(18,2),
  limite_alerta      numeric(18,2),
  pct_dtp            numeric(6,2) GENERATED ALWAYS AS (
                       round((dtp / NULLIF(rcl_ajustada, 0) * 100)::numeric, 2)
                     ) STORED,
  pct_maximo         numeric(6,2) GENERATED ALWAYS AS (
                       round((limite_maximo / NULLIF(rcl_ajustada, 0) * 100)::numeric, 2)
                     ) STORED,
  pct_prudencial     numeric(6,2) GENERATED ALWAYS AS (
                       round((limite_prudencial / NULLIF(rcl_ajustada, 0) * 100)::numeric, 2)
                     ) STORED,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (periodo)
);
CREATE INDEX IF NOT EXISTS idx_mg_lrf_limites_ano ON mg_lrf_limites (ano_ref);

COMMENT ON TABLE mg_lrf_pessoal IS
  'Despesa de pessoal do Executivo MG mês a mês (LRF). Fonte CGE/Tesouro, CKAN.';
COMMENT ON TABLE mg_lrf_limites IS
  'DTP x RCL ajustada e limites legais da LRF (janela móvel 12m), Executivo MG.';
