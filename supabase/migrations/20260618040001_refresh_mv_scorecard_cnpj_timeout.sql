-- Override da função criada em 20260618040000: REFRESH expande
-- vw_scorecard_cnpj (multi-JOIN) e estoura statement_timeout default da
-- role service_role. plpgsql + SET LOCAL desativa o timeout só durante
-- a função.

CREATE OR REPLACE FUNCTION public.refresh_mv_scorecard_cnpj()
RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  SET LOCAL statement_timeout = 0;
  SET LOCAL lock_timeout = 0;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_scorecard_cnpj;
END;
$$;
