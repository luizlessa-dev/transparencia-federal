-- Convênios vinculados a emendas parlamentares
-- Fonte: Portal da Transparência · EmendasParlamentares_Convenios.csv (bulk CGU)
-- Complementa emendas_favorecidos (PorFavorecido.csv)

CREATE TABLE IF NOT EXISTS emendas_convenios (
  numero_convenio   TEXT PRIMARY KEY,
  codigo_emenda     TEXT NOT NULL,
  codigo_funcao     TEXT,
  nome_funcao       TEXT,
  codigo_subfuncao  TEXT,
  nome_subfuncao    TEXT,
  localidade_gasto  TEXT,
  tipo_emenda       TEXT,
  data_publicacao   DATE,
  convenente        TEXT,
  objeto            TEXT,
  valor             NUMERIC,
  ingested_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emendas_convenios_codigo ON emendas_convenios (codigo_emenda);
CREATE INDEX IF NOT EXISTS idx_emendas_convenios_data   ON emendas_convenios (data_publicacao);
CREATE INDEX IF NOT EXISTS idx_emendas_convenios_conv   ON emendas_convenios (convenente);

GRANT SELECT ON emendas_convenios TO anon, authenticated;
