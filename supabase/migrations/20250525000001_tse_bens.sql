-- G2 — Declaração de Bens (TSE)
CREATE TABLE tse_bens_candidatos (
  id               SERIAL PRIMARY KEY,
  sq_candidato     TEXT NOT NULL,
  ano_eleicao      INTEGER NOT NULL,
  sg_uf            TEXT,
  nr_ordem         INTEGER NOT NULL DEFAULT 1,
  cd_tipo          INTEGER,
  ds_tipo          TEXT,
  ds_bem           TEXT,
  vr_bem           NUMERIC(18, 2) NOT NULL DEFAULT 0,
  UNIQUE (sq_candidato, ano_eleicao, nr_ordem)
);
CREATE INDEX idx_tse_bens_sq        ON tse_bens_candidatos(sq_candidato, ano_eleicao);
CREATE INDEX idx_tse_bens_ds_tipo   ON tse_bens_candidatos(ds_tipo);

CREATE TABLE tse_bens_agg (
  sq_candidato     TEXT    NOT NULL,
  ano_eleicao      INTEGER NOT NULL,
  total_bens       INTEGER NOT NULL DEFAULT 0,
  total_patrimonio NUMERIC(18, 2) NOT NULL DEFAULT 0,
  PRIMARY KEY (sq_candidato, ano_eleicao)
);
CREATE INDEX idx_tse_bens_agg_patrimonio ON tse_bens_agg(total_patrimonio DESC);
