-- CEIS + CNEP — Empresas e pessoas sancionadas pelo governo federal
CREATE TABLE portal_sancionados (
  id              SERIAL PRIMARY KEY,
  cpf_cnpj        TEXT NOT NULL,
  nome            TEXT,
  tipo_registro   TEXT NOT NULL,   -- 'CEIS' ou 'CNEP'
  tipo_sancao     TEXT,
  data_inicio     DATE,
  data_fim        DATE,            -- NULL = indeterminado
  orgao_nome      TEXT,
  orgao_uf        TEXT,
  ativo           BOOLEAN NOT NULL DEFAULT TRUE,  -- TRUE se ainda vigente hoje
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cpf_cnpj, tipo_registro, tipo_sancao, data_inicio)
);

CREATE INDEX idx_sancionados_cpf_cnpj ON portal_sancionados(cpf_cnpj);
CREATE INDEX idx_sancionados_ativo    ON portal_sancionados(ativo);
CREATE INDEX idx_sancionados_tipo     ON portal_sancionados(tipo_registro);
