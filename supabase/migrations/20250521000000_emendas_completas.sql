-- F1 — Emendas Completas (todos os tipos: Individual, Bancada, Comissão, Relator/RP9)
-- Tabelas: emendas_completas

-- =============================================================================
-- emendas_completas — lançamentos individuais de todas as emendas parlamentares
-- Inclui "Emenda de Relator" (RP9/orçamento secreto) via eh_rp9 = true
-- =============================================================================
CREATE TABLE IF NOT EXISTS emendas_completas (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_emenda         text NOT NULL,
  ano                   integer NOT NULL,
  tipo_emenda           text NOT NULL,
  eh_rp9                boolean NOT NULL GENERATED ALWAYS AS (tipo_emenda ILIKE '%relator%') STORED,
  autor_nome            text,
  numero_emenda         text,
  localidade            text,
  uf                    text,          -- sigla: SP, RJ, MG… extraído da localidade
  municipio             text,          -- nome do município quando disponível
  funcao                text,
  subfuncao             text,
  valor_empenhado       numeric(18, 2) NOT NULL DEFAULT 0,
  valor_liquidado       numeric(18, 2) NOT NULL DEFAULT 0,
  valor_pago            numeric(18, 2) NOT NULL DEFAULT 0,
  valor_resto_inscrito  numeric(18, 2) NOT NULL DEFAULT 0,
  valor_resto_cancelado numeric(18, 2) NOT NULL DEFAULT 0,
  valor_resto_pago      numeric(18, 2) NOT NULL DEFAULT 0,
  dados                 jsonb,
  atualizado_em         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (codigo_emenda, ano)
);

CREATE INDEX IF NOT EXISTS idx_emendas_completas_ano          ON emendas_completas (ano);
CREATE INDEX IF NOT EXISTS idx_emendas_completas_tipo         ON emendas_completas (tipo_emenda, ano);
CREATE INDEX IF NOT EXISTS idx_emendas_completas_rp9          ON emendas_completas (eh_rp9, ano);
CREATE INDEX IF NOT EXISTS idx_emendas_completas_uf_ano       ON emendas_completas (uf, ano);
CREATE INDEX IF NOT EXISTS idx_emendas_completas_funcao       ON emendas_completas (funcao, ano);
CREATE INDEX IF NOT EXISTS idx_emendas_completas_autor        ON emendas_completas (autor_nome, ano);

COMMENT ON TABLE emendas_completas IS
  'Emendas parlamentares de todos os tipos (Individual, Bancada, Comissão, Relator/RP9) — Portal da Transparência.';
COMMENT ON COLUMN emendas_completas.eh_rp9 IS
  'Gerado automaticamente: true quando tipo_emenda contém "relator" (orçamento secreto).';
