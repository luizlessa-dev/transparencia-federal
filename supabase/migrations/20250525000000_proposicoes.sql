-- F5 — Proposições de autoria
CREATE TABLE cam_proposicoes (
  id               INTEGER PRIMARY KEY,   -- id externo da Câmara API
  deputado_id      INTEGER NOT NULL,
  sigla_tipo       TEXT NOT NULL,
  numero           INTEGER,
  ano              INTEGER,
  ementa           TEXT,
  data_apresentacao TIMESTAMPTZ,
  atualizado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_cam_prop_deputado  ON cam_proposicoes(deputado_id);
CREATE INDEX idx_cam_prop_ano       ON cam_proposicoes(ano DESC);
CREATE INDEX idx_cam_prop_tipo      ON cam_proposicoes(sigla_tipo);

CREATE TABLE cam_proposicoes_agg (
  deputado_id      INTEGER PRIMARY KEY,
  nome             TEXT,
  sigla_partido    TEXT,
  sigla_uf         TEXT,
  url_foto         TEXT,
  total            INTEGER NOT NULL DEFAULT 0,
  total_substantivo INTEGER NOT NULL DEFAULT 0,  -- exclui REQ, DOC, PROC, ESB, EMC
  total_pl         INTEGER NOT NULL DEFAULT 0,
  total_pec        INTEGER NOT NULL DEFAULT 0,
  total_req        INTEGER NOT NULL DEFAULT 0,
  por_tipo         JSONB,
  por_ano          JSONB,
  atualizado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_cam_prop_agg_partido ON cam_proposicoes_agg(sigla_partido);
CREATE INDEX idx_cam_prop_agg_uf      ON cam_proposicoes_agg(sigla_uf);
CREATE INDEX idx_cam_prop_agg_total   ON cam_proposicoes_agg(total_substantivo DESC);
