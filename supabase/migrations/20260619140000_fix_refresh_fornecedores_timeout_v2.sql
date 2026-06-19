-- v2: usa set_config com is_local=false para sobrescrever o timeout da sessão
-- (SET LOCAL não é suficiente quando PostgREST aplica seu próprio timeout por sessão)

CREATE OR REPLACE FUNCTION public.refresh_fornecedores_intersetados()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('statement_timeout', '180000', false);
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.fornecedores_intersetados;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_almg_fornecedores_intersetados()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('statement_timeout', '180000', false);
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.almg_fornecedores_intersetados;
END;
$$;
