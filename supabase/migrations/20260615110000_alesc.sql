-- ALESC — Assembleia Legislativa de Santa Catarina
-- Deputados + despesas de gabinete (verba indenizatória / ajuda de custo)

CREATE TABLE IF NOT EXISTS alesc_deputados (
  id_alesc        TEXT PRIMARY KEY,
  nome            TEXT NOT NULL,
  nome_parlamentar TEXT,
  partido         TEXT,
  uf              TEXT DEFAULT 'SC',
  mandato         TEXT,
  ativo           BOOLEAN DEFAULT true,
  atualizado_em   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alesc_dep_partido ON alesc_deputados (partido);

CREATE TABLE IF NOT EXISTS alesc_despesas (
  id              BIGSERIAL PRIMARY KEY,
  id_alesc        TEXT,
  nome_deputado   TEXT,
  ano             INT,
  mes             INT,
  verba           TEXT,
  descricao       TEXT,
  favorecido      TEXT,
  vencimento      DATE,
  valor           NUMERIC(14,2),
  ingerido_em     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alesc_desp_deputado ON alesc_despesas (id_alesc);
CREATE INDEX IF NOT EXISTS idx_alesc_desp_ano ON alesc_despesas (ano);
CREATE INDEX IF NOT EXISTS idx_alesc_desp_favorecido ON alesc_despesas (favorecido);
CREATE INDEX IF NOT EXISTS idx_alesc_desp_valor ON alesc_despesas (valor);

GRANT SELECT ON alesc_deputados TO anon, authenticated;
GRANT SELECT ON alesc_despesas TO anon, authenticated;
