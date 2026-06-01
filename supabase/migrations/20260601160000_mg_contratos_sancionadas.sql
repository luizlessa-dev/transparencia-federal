-- ─────────────────────────────────────────────────────────────────────────
-- Contratos × Empresas Sancionadas — Executivo de MG.
--
-- Eixo investigativo: fornecedores com sanção (Lei Anticorrupção) que mantêm
-- contrato com o Estado. Cruzamento por CNPJ normalizado (só dígitos).
--
-- Fontes (CKAN dados.mg.gov.br, CC-BY-4.0):
--   contratos      = portal_contratos (SEPLAG), contratosANO.csv (flat)
--   sancionadas    = empresas_sancionadas (CGE), empresas_sancionadas.csv (flat)
-- São EMPRESAS (PJ), não pessoas físicas — sem a sensibilidade LGPD da folha.
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS mg_empresas_sancionadas (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj_norm                text,                 -- só dígitos (chave de cruzamento)
  cnpj_fmt                 text,
  empresa                  text,
  tipo_societario          text,
  conduta                  text,
  decisao                  text,
  fase                     text,
  valor_multa              numeric(16, 2),
  orgao_instaurador        text,
  orgao_lesado             text,
  ano                      int,
  data_publicacao_decisao  date,
  sei                      text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (cnpj_norm, sei)
);
CREATE INDEX IF NOT EXISTS idx_mg_sancionadas_cnpj ON mg_empresas_sancionadas (cnpj_norm);

CREATE TABLE IF NOT EXISTS mg_contratos (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ano                 int,
  orgao_codigo        text,
  orgao               text,
  fornecedor          text,
  cnpj_norm           text,                       -- só dígitos
  cnpj_fmt            text,
  tipo_pessoa         text,
  numero_contrato     text,
  numero_processo     text,
  situacao            text,
  tipo_contrato       text,
  objeto              text,
  data_assinatura     date,
  data_inicio         date,
  data_termino        date,
  valor_total         numeric(16, 2),
  valor_empenhado     numeric(16, 2),
  valor_liquidado     numeric(16, 2),
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (numero_contrato, cnpj_norm, ano)
);
CREATE INDEX IF NOT EXISTS idx_mg_contratos_cnpj  ON mg_contratos (cnpj_norm);
CREATE INDEX IF NOT EXISTS idx_mg_contratos_orgao ON mg_contratos (orgao);

COMMENT ON TABLE mg_empresas_sancionadas IS
  'Empresas sancionadas pela Lei Anticorrupção em MG (CGE). cnpj_norm = chave de cruzamento.';
COMMENT ON TABLE mg_contratos IS
  'Contratos do Estado de MG (portal_contratos/SEPLAG). cnpj_norm cruza com mg_empresas_sancionadas.';

-- ── A MANCHETE: contratos cujo fornecedor está sancionado ──────────────────
CREATE OR REPLACE VIEW mg_contratos_sancionados AS
SELECT
  c.fornecedor,
  c.cnpj_fmt,
  c.orgao,
  c.objeto,
  c.valor_total,
  c.numero_contrato,
  c.situacao,
  c.data_assinatura,
  c.data_termino,
  s.conduta,
  s.decisao,
  s.fase,
  s.valor_multa,
  s.orgao_lesado,
  s.data_publicacao_decisao,
  c.cnpj_norm
FROM mg_contratos c
JOIN mg_empresas_sancionadas s
  ON s.cnpj_norm = c.cnpj_norm
 AND length(coalesce(c.cnpj_norm, '')) = 14   -- só CNPJ (PJ), ignora CPF/vazio
ORDER BY c.valor_total DESC NULLS LAST;

COMMENT ON VIEW mg_contratos_sancionados IS
  'Contratos do Estado de MG cujo fornecedor (CNPJ) consta na lista de empresas sancionadas. Ordenado por valor do contrato.';
