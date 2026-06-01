-- ─────────────────────────────────────────────────────────────────────────
-- Eixos 3-5 do Executivo de MG: Obras (DER), Convênios de saída, Empenho.
-- Todos cruzáveis com mg_empresas_sancionadas por CNPJ. Fontes CKAN CC-BY-4.0.
-- ─────────────────────────────────────────────────────────────────────────

-- ── Obras (DER) — portal_obras/contratos.csv (flat, com CNPJ) ───────────────
CREATE TABLE IF NOT EXISTS mg_obras (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato            text,
  objeto              text,
  empresa             text,
  cnpj_norm           text,
  orgao               text,
  setor               text,
  situacao            text,
  modalidade          text,
  municipios          text,
  data_assinatura     date,
  dias_paralisados    int,
  dias_atuais         int,
  valor_total         numeric(16, 2),
  total_medido        numeric(16, 2),
  percentual_execucao numeric(6, 4),
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (contrato, cnpj_norm)
);
CREATE INDEX IF NOT EXISTS idx_mg_obras_cnpj      ON mg_obras (cnpj_norm);
CREATE INDEX IF NOT EXISTS idx_mg_obras_paralisad ON mg_obras (dias_paralisados) WHERE dias_paralisados > 0;

-- obras paradas (com pagamento já medido) — ângulo "obra parada"
CREATE OR REPLACE VIEW mg_obras_paradas AS
SELECT contrato, objeto, empresa, orgao, municipios, situacao,
       dias_paralisados, valor_total, total_medido, percentual_execucao
FROM mg_obras
WHERE dias_paralisados > 0
ORDER BY valor_total DESC NULLS LAST;

-- obras com fornecedor sancionado
CREATE OR REPLACE VIEW mg_obras_sancionadas AS
SELECT o.contrato, o.objeto, o.empresa, o.cnpj_norm, o.orgao, o.valor_total,
       o.situacao, o.dias_paralisados, o.percentual_execucao,
       s.conduta, s.decisao, s.fase,
       (s.decisao IS NOT NULL AND s.decisao !~* 'arquiv' AND s.decisao !~* 'absolv') AS condenada
FROM mg_obras o
JOIN mg_empresas_sancionadas s ON s.cnpj_norm = o.cnpj_norm AND length(coalesce(o.cnpj_norm,'')) = 14
ORDER BY o.valor_total DESC NULLS LAST;

-- ── Convênios de saída — ft_convenio × dm_convenente (star) ─────────────────
CREATE TABLE IF NOT EXISTS mg_convenios (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  convenio_id       text,
  ano               int,
  orgao_id          text,
  municipio_id      text,
  convenente        text,
  convenente_cnpj   text,           -- normalizado
  vr_total          numeric(16, 2),
  vr_concede        numeric(16, 2),
  vr_emenda_parl    numeric(16, 2),
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (convenio_id, ano)
);
CREATE INDEX IF NOT EXISTS idx_mg_convenios_cnpj ON mg_convenios (convenente_cnpj);
CREATE INDEX IF NOT EXISTS idx_mg_convenios_ano  ON mg_convenios (ano);

CREATE OR REPLACE VIEW mg_convenios_sancionados AS
SELECT cv.convenio_id, cv.ano, cv.convenente, cv.convenente_cnpj, cv.orgao_id,
       cv.vr_total, cv.vr_emenda_parl, s.conduta, s.decisao, s.fase,
       (s.decisao IS NOT NULL AND s.decisao !~* 'arquiv' AND s.decisao !~* 'absolv') AS condenada
FROM mg_convenios cv
JOIN mg_empresas_sancionadas s ON s.cnpj_norm = cv.convenente_cnpj AND length(coalesce(cv.convenente_cnpj,'')) = 14
ORDER BY cv.vr_total DESC NULLS LAST;

-- ── Empenho × sancionadas (enxuto: só pagamentos a empresas sancionadas) ────
CREATE TABLE IF NOT EXISTS mg_empenhos_sancionados (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ano                 int,
  numero_empenho      text,
  orgao               text,
  credor              text,
  cnpj_norm           text,
  elemento_despesa    text,
  fonte_recurso       text,
  data_registro       date,
  numero_processo     text,
  valor_empenhado     numeric(16, 2),
  valor_liquidado     numeric(16, 2),
  valor_pago          numeric(16, 2),
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (ano, numero_empenho, orgao)
);
CREATE INDEX IF NOT EXISTS idx_mg_empenhos_sanc_cnpj ON mg_empenhos_sancionados (cnpj_norm);

COMMENT ON TABLE mg_empenhos_sancionados IS
  'Empenhos (pagamentos) do Estado de MG a empresas que constam na lista de sancionadas — filtrado na ingestão. Cruzar fase/decisão p/ separar condenada de arquivada.';
