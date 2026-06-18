-- Tabelas para ingestão do TransfereGov (TED e FAF)
-- Fonte: api.transferegov.gestao.gov.br (PostgREST público)

-- ──────────────────────────────────────────────
-- TED — Termos de Execução Descentralizada
-- ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ted_planos_acao (
  id_plano_acao                   INTEGER PRIMARY KEY,
  id_programa                     INTEGER,
  sigla_unidade_descentralizada   TEXT,
  unidade_descentralizada         TEXT,
  sigla_unidade_execucao          TEXT,
  unidade_execucao                TEXT,
  valor_total                     NUMERIC,
  data_inicio_vigencia            DATE,
  data_fim_vigencia               DATE,
  objeto                          TEXT,
  situacao                        TEXT,
  ano                             INTEGER,
  forma_execucao_direta           BOOLEAN,
  forma_execucao_particulares     BOOLEAN,
  forma_execucao_descentralizada  BOOLEAN,
  valor_beneficiario_especifico   NUMERIC,
  valor_chamamento_publico        NUMERIC,
  dados                           JSONB,
  atualizado_em                   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ted_planos_situacao ON ted_planos_acao (situacao);
CREATE INDEX IF NOT EXISTS idx_ted_planos_ano      ON ted_planos_acao (ano);

CREATE TABLE IF NOT EXISTS ted_termos_execucao (
  id_termo            INTEGER PRIMARY KEY,
  id_plano_acao       INTEGER REFERENCES ted_planos_acao (id_plano_acao),
  situacao            TEXT,
  numero_processo_sei TEXT,
  numero_ns           TEXT,
  data_assinatura     DATE,
  data_divulgacao     DATE,
  data_recebimento    DATE,
  data_efetivacao     DATE,
  minuta_padrao       BOOLEAN,
  dados               JSONB,
  atualizado_em       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ted_termos_plano    ON ted_termos_execucao (id_plano_acao);
CREATE INDEX IF NOT EXISTS idx_ted_termos_situacao ON ted_termos_execucao (situacao);

-- ──────────────────────────────────────────────
-- FAF — Fundo a Fundo
-- ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS faf_planos_acao (
  id_plano_acao              INTEGER PRIMARY KEY,
  codigo                     TEXT,
  data_inicio_vigencia       DATE,
  data_fim_vigencia          DATE,
  situacao                   TEXT,
  id_programa                INTEGER,

  -- Repassador (órgão federal)
  sigla_orgao_repassador     TEXT,
  cnpj_orgao_repassador      TEXT,
  nome_orgao_repassador      TEXT,

  -- Fundo repassador
  cnpj_fundo_repassador      TEXT,
  nome_fundo_repassador      TEXT,
  uf_fundo_repassador        TEXT,

  -- Recebedor (ente municipal/estadual)
  cnpj_ente_recebedor        TEXT,
  nome_ente_recebedor        TEXT,
  uf_recebedor               TEXT,
  municipio_recebedor        TEXT,
  ibge_recebedor             INTEGER,

  -- Fundo recebedor
  cnpj_fundo_recebedor       TEXT,
  nome_fundo_recebedor       TEXT,
  uf_fundo_recebedor         TEXT,
  municipio_fundo_recebedor  TEXT,
  ibge_fundo_recebedor       INTEGER,

  -- Valores
  valor_total                NUMERIC,
  valor_repasse_total        NUMERIC,
  valor_repasse_emenda       NUMERIC,
  valor_repasse_voluntario   NUMERIC,
  valor_recursos_proprios    NUMERIC,
  valor_custeio              NUMERIC,
  valor_investimento         NUMERIC,
  valor_saldo_disponivel     NUMERIC,

  dados                      JSONB,
  atualizado_em              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_faf_planos_situacao    ON faf_planos_acao (situacao);
CREATE INDEX IF NOT EXISTS idx_faf_planos_uf          ON faf_planos_acao (uf_recebedor);
CREATE INDEX IF NOT EXISTS idx_faf_planos_ibge        ON faf_planos_acao (ibge_recebedor);
CREATE INDEX IF NOT EXISTS idx_faf_planos_orgao       ON faf_planos_acao (sigla_orgao_repassador);
CREATE INDEX IF NOT EXISTS idx_faf_planos_cnpj_rec    ON faf_planos_acao (cnpj_ente_recebedor);

GRANT SELECT ON ted_planos_acao     TO anon, authenticated;
GRANT SELECT ON ted_termos_execucao TO anon, authenticated;
GRANT SELECT ON faf_planos_acao     TO anon, authenticated;
