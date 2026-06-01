-- ─────────────────────────────────────────────────────────────────────────
-- Eixos 6-7 do Executivo de MG: Compras emergenciais COVID-19 e Terceirizados.
-- Fontes CKAN CC-BY-4.0. Cruzam com mg_empresas_sancionadas por CNPJ.
-- ─────────────────────────────────────────────────────────────────────────

-- ── COVID emergencial (flat, por item de processo) ──────────────────────────
CREATE TABLE IF NOT EXISTS mg_covid_compras (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_processo     text,
  objeto              text,
  orgao_demandante    text,
  orgao_contrato      text,
  situacao            text,
  procedimento        text,                 -- "Dispensa de Licitação" etc.
  numero_contrato     text,
  data_publicacao     date,
  contratado          text,
  cnpj_norm           text,
  item                text,
  linha_fornecimento  text,
  cidade_entrega      text,
  quantidade          numeric(16, 3),
  valor_ref_unit      numeric(16, 2),
  valor_hom_unit      numeric(16, 2),
  valor_referencia    numeric(16, 2),
  valor_homologado    numeric(16, 2),
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (numero_processo, item, cnpj_norm, valor_homologado)
);
CREATE INDEX IF NOT EXISTS idx_mg_covid_cnpj ON mg_covid_compras (cnpj_norm);

-- sobrepreço: unitário homologado acima do unitário de referência
CREATE OR REPLACE VIEW mg_covid_sobrepreco AS
SELECT contratado, cnpj_norm, orgao_demandante, objeto, item, procedimento,
       quantidade, valor_ref_unit, valor_hom_unit, valor_homologado,
       round((valor_hom_unit - valor_ref_unit), 2) AS sobrepreco_unit,
       round(((valor_hom_unit - valor_ref_unit) / nullif(valor_ref_unit, 0)) * 100, 1) AS sobrepreco_pct
FROM mg_covid_compras
WHERE valor_ref_unit > 0 AND valor_hom_unit > valor_ref_unit
ORDER BY (valor_hom_unit - valor_ref_unit) * coalesce(quantidade, 1) DESC NULLS LAST;

CREATE OR REPLACE VIEW mg_covid_sancionados AS
SELECT cc.contratado, cc.cnpj_norm, cc.orgao_demandante, cc.objeto, cc.valor_homologado,
       cc.procedimento, s.conduta, s.decisao, s.fase,
       (s.decisao IS NOT NULL AND s.decisao !~* 'arquiv' AND s.decisao !~* 'absolv') AS condenada
FROM mg_covid_compras cc
JOIN mg_empresas_sancionadas s ON s.cnpj_norm = cc.cnpj_norm AND length(coalesce(cc.cnpj_norm,'')) = 14
ORDER BY cc.valor_homologado DESC NULLS LAST;

-- ── Terceirizados (AGREGADO por empresa/órgão — nunca por pessoa) ───────────
CREATE TABLE IF NOT EXISTS mg_terceirizados (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa           text,
  cnpj_norm         text,
  orgao             text,
  mes_referencia    date,
  qtd_trabalhadores int,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (cnpj_norm, orgao, mes_referencia)
);
CREATE INDEX IF NOT EXISTS idx_mg_terceir_cnpj ON mg_terceirizados (cnpj_norm);

CREATE OR REPLACE VIEW mg_terceirizados_sancionados AS
SELECT t.empresa, t.cnpj_norm, t.orgao, t.mes_referencia, t.qtd_trabalhadores,
       s.conduta, s.decisao, s.fase,
       (s.decisao IS NOT NULL AND s.decisao !~* 'arquiv' AND s.decisao !~* 'absolv') AS condenada
FROM mg_terceirizados t
JOIN mg_empresas_sancionadas s ON s.cnpj_norm = t.cnpj_norm AND length(coalesce(t.cnpj_norm,'')) = 14
ORDER BY t.qtd_trabalhadores DESC NULLS LAST;

COMMENT ON TABLE mg_terceirizados IS
  'Terceirizados AGREGADOS por empresa/órgão/mês (headcount). Nomes individuais NÃO são armazenados (LGPD / sem interesse público nominal).';
