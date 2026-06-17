-- Versão definitiva: SET na definição da função (não SET LOCAL no corpo).
-- O LOCAL é sobrescrito pelo statement_timeout que o PostgREST aplica na
-- transação externa antes de chamar a função. SET na cláusula da função
-- vale durante toda a execução, vence o timeout do role.

CREATE OR REPLACE FUNCTION public.refresh_mv_scorecard_cnpj()
RETURNS void
LANGUAGE plpgsql
SET statement_timeout = '0'
SET lock_timeout      = '0'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_scorecard_cnpj;
END;
$$;
