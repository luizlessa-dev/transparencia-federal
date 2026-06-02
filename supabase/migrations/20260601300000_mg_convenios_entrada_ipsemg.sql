-- ─────────────────────────────────────────────────────────────────────────
-- Fecha a cobertura de datasets MG:
--  • mg_convenios_entrada — recursos que ENTRAM no Estado (quem concede →
--    órgão proponente estadual → valor). 1 linha por convênio (sem dupla
--    contagem dos snapshots temporais da fato).
--  • mg_ipsemg_contratos — credenciados/contratos vigentes do IPSEMG (saúde),
--    nominativo + CNPJ → cruzável com sancionadas. Sem valor na fonte.
-- Fonte CKAN CC-BY-4.0.
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mg_convenios_entrada (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_convenio     text,
  concedente      text,             -- quem repassa (prefeitura, União, etc.)
  concedente_doc  text,             -- CNPJ/doc do concedente
  proponente      text,             -- órgão estadual receptor
  situacao        text,
  ano             int,
  vr_concedente   numeric(18,2),    -- valor repassado pelo concedente
  vr_proponente   numeric(18,2),    -- contrapartida do Estado
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (id_convenio)
);
CREATE INDEX IF NOT EXISTS idx_mg_conv_entrada_ano ON mg_convenios_entrada (ano);

CREATE TABLE IF NOT EXISTS mg_ipsemg_contratos (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  num_contrato       text,
  cnpj_norm          text,
  nome               text,
  ramo_atividade     text,
  municipio          text,
  regiao             text,
  microrregiao       text,
  inicio_vigencia    date,
  fim_vigencia       date,
  periodo_referencia date,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (num_contrato, cnpj_norm, inicio_vigencia)
);
CREATE INDEX IF NOT EXISTS idx_mg_ipsemg_cnpj ON mg_ipsemg_contratos (cnpj_norm);

COMMENT ON TABLE mg_convenios_entrada IS
  'Convênios de entrada de recursos no Estado de MG (concedente→proponente). 1 linha por convênio. CKAN.';
COMMENT ON TABLE mg_ipsemg_contratos IS
  'Credenciados/contratos vigentes do IPSEMG (saúde), nominativo + CNPJ. Sem valor na fonte. CKAN.';
