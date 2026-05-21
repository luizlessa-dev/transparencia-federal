-- G5 — Score de Risco Composto por Parlamentar
CREATE TABLE IF NOT EXISTS cam_parlamentar_risco (
  deputado_id           INTEGER PRIMARY KEY,
  nome                  TEXT NOT NULL,
  sigla_partido         TEXT,
  sigla_uf              TEXT,
  url_foto              TEXT,
  -- Score final (0–100, maior = mais alertas)
  score_total           NUMERIC(5,1) NOT NULL DEFAULT 0,
  -- Dimensões normalizadas (0–100 cada)
  dim_ceap              NUMERIC(5,1) DEFAULT 0,   -- percentil gasto CEAP 2024
  dim_presenca          NUMERIC(5,1) DEFAULT 0,   -- % ausência (100 − pct_presenca)
  dim_producao          NUMERIC(5,1) DEFAULT 0,   -- % proposições procedurais (REQ/DOC)
  dim_financiamento     NUMERIC(5,1) DEFAULT 0,   -- percentil arrecadação TSE 2022
  dim_rp9               NUMERIC(5,1) DEFAULT 0,   -- % do valor de emendas que é RP9
  -- Valores brutos para display
  ceap_total_2024       NUMERIC(15,2),
  passagens_aereas_2024 NUMERIC(15,2),
  presenca_pct          NUMERIC(5,2),
  concordancia_partido  NUMERIC(5,2),
  total_proposicoes     INTEGER,
  total_substantivo     INTEGER,
  financiamento_total   NUMERIC(15,2),
  financiamento_fefc    NUMERIC(15,2),             -- fundo especial campanha
  patrimonio_2022       NUMERIC(18,2),
  -- Sinalizadores CEIS/CNEP (populados depois)
  fornecedores_sancionados INTEGER NOT NULL DEFAULT 0,
  doadores_sancionados     INTEGER NOT NULL DEFAULT 0,
  atualizado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risco_score     ON cam_parlamentar_risco(score_total DESC);
CREATE INDEX IF NOT EXISTS idx_risco_partido   ON cam_parlamentar_risco(sigla_partido);
CREATE INDEX IF NOT EXISTS idx_risco_uf        ON cam_parlamentar_risco(sigla_uf);
