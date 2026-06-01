-- ─────────────────────────────────────────────────────────────────────────
-- Emendas Federais executadas pelo Estado de MG (entrada de recursos).
-- Rastreio: autoria (relator/bancada/individual) → valor indicado/repassado →
-- objeto → órgão executor (destino) → função de governo. Inclui Transferências
-- Especiais (PIX). Flat, nomeado. Fonte CKAN "Emendas Federais" (SEGOV/SEPLAG).
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mg_emendas_federais (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  esfera              text,
  modalidade          text,
  autoria             text,
  tipo_instrumento    text,
  numero_emenda       text,
  ano                 int,
  codigo_siafi        text,
  codigo_sigcon       text,
  valor_indicado      numeric(18,2),
  valor_repassado     numeric(18,2),
  valor_nao_repassado numeric(18,2) GENERATED ALWAYS AS
                        (coalesce(valor_indicado, 0) - coalesce(valor_repassado, 0)) STORED,
  objeto              text,
  funcao_governo      text,
  orgao_executor      text,
  dedupe_key          text GENERATED ALWAYS AS (
                        md5(
                          coalesce(numero_emenda,'') || '|' || coalesce(ano::text,'') || '|' ||
                          coalesce(codigo_siafi,'') || '|' || coalesce(codigo_sigcon,'') || '|' ||
                          coalesce(orgao_executor,'') || '|' || coalesce(objeto,'') || '|' ||
                          coalesce(valor_indicado::text,'') || '|' || coalesce(valor_repassado::text,'')
                        )
                      ) STORED,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mg_emendas_fed_dedupe ON mg_emendas_federais (dedupe_key);
CREATE INDEX IF NOT EXISTS idx_mg_emendas_fed_ano ON mg_emendas_federais (ano);
CREATE INDEX IF NOT EXISTS idx_mg_emendas_fed_mod ON mg_emendas_federais (modalidade);

COMMENT ON TABLE mg_emendas_federais IS
  'Emendas federais executadas por MG (entrada). Autoria, valor indicado/repassado, objeto, órgão executor. Inclui transferências especiais (PIX).';
