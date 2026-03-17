-- Transparência Federal v3 — Migration inicial
-- Responsabilidade: criar as 9 tabelas mínimas do blueprint, na ordem de dependência de FK.
-- Ref: docs/02-MODELO-DADOS.md

-- =============================================================================
-- 1. parlamentares (referência; sem FK)
-- =============================================================================
CREATE TABLE parlamentares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  partido text,
  uf text,
  id_externo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE parlamentares IS 'Cadastro de parlamentar; referenciado por emendas_financeiro e rankings.';

-- =============================================================================
-- 2. execucoes_pipeline (operacional; sem FK)
-- =============================================================================
CREATE TABLE execucoes_pipeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_nome text NOT NULL,
  iniciado_em timestamptz NOT NULL DEFAULT now(),
  finalizado_em timestamptz,
  status text NOT NULL,
  detalhes jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_execucoes_pipeline_job_iniciado ON execucoes_pipeline (job_nome, iniciado_em DESC);

COMMENT ON TABLE execucoes_pipeline IS 'Registro de cada execução de job; base da observabilidade.';

-- =============================================================================
-- 3. execucoes_pipeline_etapas (operacional; FK → execucoes_pipeline)
-- =============================================================================
CREATE TABLE execucoes_pipeline_etapas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execucao_id uuid NOT NULL REFERENCES execucoes_pipeline (id) ON DELETE CASCADE,
  etapa_nome text NOT NULL,
  iniciado_em timestamptz NOT NULL DEFAULT now(),
  finalizado_em timestamptz,
  status text NOT NULL,
  detalhes jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_execucoes_pipeline_etapas_execucao ON execucoes_pipeline_etapas (execucao_id);

COMMENT ON TABLE execucoes_pipeline_etapas IS 'Etapas dentro de uma execução; rastreabilidade fina.';

-- =============================================================================
-- 4. emendas_brutas (bruta; sem FK)
-- =============================================================================
CREATE TABLE emendas_brutas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ano int NOT NULL,
  id_externo text NOT NULL,
  dados jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ano, id_externo)
);

CREATE INDEX idx_emendas_brutas_ano ON emendas_brutas (ano);

COMMENT ON TABLE emendas_brutas IS 'Dados crus da ingestão (Portal da Transparência); upsert por (ano, id_externo).';

-- =============================================================================
-- 5. cobertura_dados (operacional; sem FK)
-- =============================================================================
CREATE TABLE cobertura_dados (
  ano int PRIMARY KEY,
  ultima_ingestao_em timestamptz,
  status text,
  total_registros int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE cobertura_dados IS 'Metadados de cobertura por ano; usado pela ingestão e pela API de status.';

-- =============================================================================
-- 6. emendas_financeiro (intermediária; FK → parlamentares)
-- =============================================================================
CREATE TABLE emendas_financeiro (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ano int NOT NULL,
  id_externo text NOT NULL,
  parlamentar_id uuid REFERENCES parlamentares (id) ON DELETE SET NULL,
  valor_empenhado numeric(18, 2) NOT NULL DEFAULT 0,
  valor_liquidado numeric(18, 2) NOT NULL DEFAULT 0,
  valor_pago numeric(18, 2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ano, id_externo)
);

CREATE INDEX idx_emendas_financeiro_ano ON emendas_financeiro (ano);
CREATE INDEX idx_emendas_financeiro_parlamentar ON emendas_financeiro (parlamentar_id);

COMMENT ON TABLE emendas_financeiro IS 'Emendas com valores empenhado/liquidado/pago; resultado do enriquecimento.';

-- =============================================================================
-- 7. ranking_parlamentar_build (analítica staging; FK → parlamentares)
-- =============================================================================
CREATE TABLE ranking_parlamentar_build (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id uuid NOT NULL,
  parlamentar_id uuid NOT NULL REFERENCES parlamentares (id) ON DELETE CASCADE,
  ano int NOT NULL,
  posicao int NOT NULL,
  valor_total numeric(18, 2) NOT NULL,
  metricas jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (build_id, parlamentar_id, ano)
);

CREATE INDEX idx_ranking_parlamentar_build_build ON ranking_parlamentar_build (build_id);
CREATE INDEX idx_ranking_parlamentar_build_parlamentar_ano ON ranking_parlamentar_build (parlamentar_id, ano);

COMMENT ON TABLE ranking_parlamentar_build IS 'Ranking por build; staging antes da publicação.';

-- =============================================================================
-- 8. ranking_parlamentar (pública; FK → parlamentares)
-- =============================================================================
CREATE TABLE ranking_parlamentar (
  parlamentar_id uuid NOT NULL REFERENCES parlamentares (id) ON DELETE CASCADE,
  ano int NOT NULL,
  posicao int NOT NULL,
  valor_total numeric(18, 2) NOT NULL,
  metricas jsonb,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (parlamentar_id, ano)
);

CREATE INDEX idx_ranking_parlamentar_ano ON ranking_parlamentar (ano);
CREATE INDEX idx_ranking_parlamentar_posicao_ano ON ranking_parlamentar (ano, posicao);

COMMENT ON TABLE ranking_parlamentar IS 'Ranking publicado; somente job_publicar_ranking escreve aqui.';

-- =============================================================================
-- 9. snapshots_ranking (analítica; sem FK)
-- =============================================================================
CREATE TABLE snapshots_ranking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  build_em timestamptz NOT NULL,
  ano int NOT NULL,
  dados jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_snapshots_ranking_ano ON snapshots_ranking (ano);
CREATE INDEX idx_snapshots_ranking_build_em ON snapshots_ranking (build_em DESC);

COMMENT ON TABLE snapshots_ranking IS 'Snapshots históricos do ranking; auditoria e série temporal.';
