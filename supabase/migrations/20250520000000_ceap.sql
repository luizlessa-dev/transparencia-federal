-- F7 — CEAP (Despesas de Gabinete dos Deputados)
-- Tabelas: deputados_brutas, ceaps_brutas, ceaps_ranking

-- =============================================================================
-- 1. deputados_brutas — dados brutos da API da Câmara
-- =============================================================================
CREATE TABLE IF NOT EXISTS deputados_brutas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_externo  text NOT NULL UNIQUE,           -- ID numérico da API da Câmara
  nome        text NOT NULL,
  sigla_partido text,
  sigla_uf    text,
  id_legislatura integer,
  url_foto    text,
  email       text,
  dados       jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deputados_brutas_id_externo ON deputados_brutas (id_externo);
CREATE INDEX IF NOT EXISTS idx_deputados_brutas_uf_partido ON deputados_brutas (sigla_uf, sigla_partido);

COMMENT ON TABLE deputados_brutas IS 'Dados brutos dos deputados federais (API Câmara /deputados).';

-- =============================================================================
-- 2. ceaps_brutas — lançamentos individuais de despesa CEAP
-- =============================================================================
CREATE TABLE IF NOT EXISTS ceaps_brutas (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ano                   integer NOT NULL,
  cod_documento         text NOT NULL,
  deputado_id_externo   text NOT NULL REFERENCES deputados_brutas (id_externo) ON DELETE CASCADE,
  tipo_despesa          text,
  tipo_documento        text,
  nome_fornecedor       text,
  cnpj_cpf_fornecedor   text,
  valor_documento       numeric(14, 2),
  valor_liquido         numeric(14, 2),
  valor_glosa           numeric(14, 2),
  data_documento        date,
  url_documento         text,
  dados                 jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ano, cod_documento)
);

CREATE INDEX IF NOT EXISTS idx_ceaps_brutas_deputado_ano ON ceaps_brutas (deputado_id_externo, ano);
CREATE INDEX IF NOT EXISTS idx_ceaps_brutas_ano ON ceaps_brutas (ano);
CREATE INDEX IF NOT EXISTS idx_ceaps_brutas_tipo ON ceaps_brutas (tipo_despesa);
CREATE INDEX IF NOT EXISTS idx_ceaps_brutas_fornecedor ON ceaps_brutas (cnpj_cpf_fornecedor);

COMMENT ON TABLE ceaps_brutas IS 'Lançamentos brutos da Cota para Exercício da Atividade Parlamentar (CEAP).';

-- =============================================================================
-- 3. ceaps_ranking — agregação por deputado × ano (gerada pelo analytics)
-- =============================================================================
CREATE TABLE IF NOT EXISTS ceaps_ranking (
  deputado_id_externo   text NOT NULL REFERENCES deputados_brutas (id_externo) ON DELETE CASCADE,
  ano                   integer NOT NULL,
  posicao               integer,
  total_liquido         numeric(14, 2) NOT NULL DEFAULT 0,
  total_documentos      integer NOT NULL DEFAULT 0,
  por_categoria         jsonb,                -- { "PASSAGENS AÉREAS": 12345.00, ... }
  atualizado_em         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (deputado_id_externo, ano)
);

CREATE INDEX IF NOT EXISTS idx_ceaps_ranking_ano_posicao ON ceaps_ranking (ano, posicao);

COMMENT ON TABLE ceaps_ranking IS 'Ranking de despesas CEAP por deputado e ano — gerado pelo job_ceaps_ranking.';
