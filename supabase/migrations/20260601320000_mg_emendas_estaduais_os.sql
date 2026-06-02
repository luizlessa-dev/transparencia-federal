-- ─────────────────────────────────────────────────────────────────────────
-- Dois últimos eixos de MG:
--  • mg_emendas_estaduais — emendas ao orçamento estadual (LOA). A ponte
--    ft_orcamento_emenda (id_emenda + id_autor + vr_emenda) liga autor (deputado
--    estadual) → valor → objeto → órgão beneficiado. 1 linha por emenda.
--  • mg_os_parcerias — Termos de Parceria e Contratos de Gestão (organizações
--    sociais). Entidade parceira nomeada + CNPJ → cruzável com sancionadas.
--    Repasses (previsto/atualizado) somados do arquivo de repasses.
-- Fonte CKAN CC-BY-4.0.
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mg_emendas_estaduais (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_emenda       text,
  nr_emenda       text,
  ano             int,
  autor           text,
  grupo           text,
  modalidade      text,
  uo_beneficiada  text,
  objeto          text,
  vr_emenda       numeric(18,2),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (id_emenda)
);
CREATE INDEX IF NOT EXISTS idx_mg_emendas_est_ano ON mg_emendas_estaduais (ano);

CREATE TABLE IF NOT EXISTS mg_os_parcerias (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_instrumento        text,
  tipo_instrumento      text,             -- Contrato de Gestão / Termo de Parceria
  num_termo             text,
  orgao_estatal         text,
  entidade              text,             -- organização social parceira
  entidade_sigla        text,
  cnpj_norm             text,
  objeto                text,
  situacao              text,
  inicio_vigencia       date,
  fim_vigencia          date,
  vr_repasse_previsto   numeric(18,2),
  vr_repasse_atualizado numeric(18,2),
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (id_instrumento)
);
CREATE INDEX IF NOT EXISTS idx_mg_os_cnpj ON mg_os_parcerias (cnpj_norm);

COMMENT ON TABLE mg_emendas_estaduais IS
  'Emendas ao orçamento estadual de MG (LOA): autor (deputado) → valor → objeto → órgão. 1 linha/emenda. CKAN.';
COMMENT ON TABLE mg_os_parcerias IS
  'Termos de Parceria e Contratos de Gestão (organizações sociais) de MG. Entidade + CNPJ + repasses. CKAN.';
