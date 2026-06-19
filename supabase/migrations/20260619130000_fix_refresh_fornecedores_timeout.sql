-- Aumenta o timeout local das RPCs de refresh dos cruzamentos ALEPE×ALESP×Câmara.
-- A query agrega ceaps_brutas (4M) + gastos_parlamentares (670k), ultrapassando o
-- statement_timeout padrão de 25s. Timeout local de 180s é suficiente.

CREATE OR REPLACE FUNCTION public.refresh_fornecedores_intersetados()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  SET LOCAL statement_timeout = '180s';
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.fornecedores_intersetados;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_almg_fornecedores_intersetados()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  SET LOCAL statement_timeout = '180s';
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.almg_fornecedores_intersetados;
END;
$$;
