-- Função de refresh pra mv_scorecard_cnpj.
--
-- scripts/refresh-mv-scorecard.ts chamava sb.rpc("query", { sql: "REFRESH ..." })
-- pra um RPC `query` que nunca existiu — sempre caía no fallback que só LIA a
-- MV. Padroniza com refresh_cota_cnpj_ranking() (criada em
-- 20260617000000_mv_cota_cnpj_ranking.sql).
--
-- CONCURRENTLY funciona porque a MV já tem UNIQUE index em (cnpj).

CREATE OR REPLACE FUNCTION public.refresh_mv_scorecard_cnpj()
RETURNS void
LANGUAGE sql AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_scorecard_cnpj;
$$;
