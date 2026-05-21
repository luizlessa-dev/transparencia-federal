-- ─────────────────────────────────────────────
-- Frentes parlamentares
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cam_frentes (
  id              INTEGER PRIMARY KEY,
  titulo          TEXT    NOT NULL,
  id_legislatura  INTEGER NOT NULL DEFAULT 57,
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cam_frentes_membros (
  frente_id    INTEGER NOT NULL REFERENCES cam_frentes(id) ON DELETE CASCADE,
  deputado_id  INTEGER NOT NULL,
  nome         TEXT,
  sigla_partido TEXT,
  sigla_uf     TEXT,
  PRIMARY KEY (frente_id, deputado_id)
);

CREATE INDEX IF NOT EXISTS idx_frentes_membros_deputado
  ON cam_frentes_membros(deputado_id);

-- ─────────────────────────────────────────────
-- Comissões permanentes
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cam_comissoes (
  id              INTEGER PRIMARY KEY,
  sigla           TEXT,
  nome            TEXT    NOT NULL,
  apelido         TEXT,
  tipo_orgao      TEXT,
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cam_comissoes_membros (
  comissao_id  INTEGER NOT NULL REFERENCES cam_comissoes(id) ON DELETE CASCADE,
  deputado_id  INTEGER NOT NULL,
  nome         TEXT,
  sigla_partido TEXT,
  sigla_uf     TEXT,
  titulo       TEXT,   -- 'Titular', 'Suplente', 'Presidente', etc.
  data_inicio  DATE,
  data_fim     DATE,
  PRIMARY KEY (comissao_id, deputado_id)
);

CREATE INDEX IF NOT EXISTS idx_comissoes_membros_deputado
  ON cam_comissoes_membros(deputado_id);

-- ─────────────────────────────────────────────
-- Enriquecimento de cam_parlamentar_risco
-- ─────────────────────────────────────────────
ALTER TABLE cam_parlamentar_risco
  ADD COLUMN IF NOT EXISTS total_legislaturas  INTEGER,
  ADD COLUMN IF NOT EXISTS primeira_legislatura INTEGER,
  ADD COLUMN IF NOT EXISTS cargo_anterior       TEXT,
  ADD COLUMN IF NOT EXISTS total_frentes        INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_comissoes      INTEGER NOT NULL DEFAULT 0;
