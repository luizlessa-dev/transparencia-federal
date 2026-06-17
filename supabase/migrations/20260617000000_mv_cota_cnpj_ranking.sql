-- cota_cnpj_ranking: era VIEW agregando 4M+ linhas de cota_despesa por CNPJ.
-- Toda consulta estourava statement_timeout (jun/2026: erro 57014). Substituída
-- por materialized view + função de refresh, mesmo nome para drop-in.

DROP VIEW IF EXISTS public.cota_cnpj_ranking;

CREATE MATERIALIZED VIEW IF NOT EXISTS public.cota_cnpj_ranking AS
SELECT
  cnpj_cpf_fornecedor              AS cnpj,
  nome_fornecedor,
  COUNT(DISTINCT id_deputado)      AS n_deputados,
  COUNT(*)                         AS n_notas,
  SUM(valor_liquido)               AS total_liquido_brl,
  MIN(data_emissao)                AS primeira_nota,
  MAX(data_emissao)                AS ultima_nota
FROM public.cota_despesa
WHERE cnpj_cpf_fornecedor IS NOT NULL
  AND cnpj_cpf_fornecedor <> ''
GROUP BY cnpj_cpf_fornecedor, nome_fornecedor;

-- UNIQUE index é pré-requisito para REFRESH MATERIALIZED VIEW CONCURRENTLY.
-- COALESCE para tratar nome_fornecedor NULL, garantindo unicidade real.
CREATE UNIQUE INDEX IF NOT EXISTS cota_cnpj_ranking_pk
  ON public.cota_cnpj_ranking (cnpj, COALESCE(nome_fornecedor, ''));

CREATE INDEX IF NOT EXISTS cota_cnpj_ranking_valor
  ON public.cota_cnpj_ranking (total_liquido_brl DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS cota_cnpj_ranking_cnpj
  ON public.cota_cnpj_ranking (cnpj);

CREATE OR REPLACE FUNCTION public.refresh_cota_cnpj_ranking()
RETURNS void
LANGUAGE sql AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.cota_cnpj_ranking;
$$;

GRANT SELECT ON public.cota_cnpj_ranking TO anon, authenticated, service_role;
