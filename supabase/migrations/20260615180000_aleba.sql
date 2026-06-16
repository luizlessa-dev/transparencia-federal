-- ALEBA — Assembleia Legislativa do Estado da Bahia
-- Deputados via API NoPaper (https://albalegis.nopapercloud.com.br/api/publico/)
-- Despesas: sem endpoint público disponível (tabela criada para futura expansão)

CREATE TABLE IF NOT EXISTS aleba_deputados (
  id_aleba        TEXT PRIMARY KEY,
  nome            TEXT NOT NULL,
  nome_parlamentar TEXT,
  partido         TEXT,
  uf              TEXT DEFAULT 'BA',
  ativo           BOOLEAN DEFAULT true,
  atualizado_em   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aleba_dep_partido ON aleba_deputados (partido);

CREATE TABLE IF NOT EXISTS aleba_despesas (
  id              BIGSERIAL PRIMARY KEY,
  id_aleba        TEXT,
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

CREATE INDEX IF NOT EXISTS idx_aleba_desp_deputado ON aleba_despesas (id_aleba);
CREATE INDEX IF NOT EXISTS idx_aleba_desp_ano ON aleba_despesas (ano);
CREATE INDEX IF NOT EXISTS idx_aleba_desp_favorecido ON aleba_despesas (favorecido);
CREATE INDEX IF NOT EXISTS idx_aleba_desp_valor ON aleba_despesas (valor);

GRANT SELECT ON aleba_deputados TO anon, authenticated;
GRANT SELECT ON aleba_despesas TO anon, authenticated;
