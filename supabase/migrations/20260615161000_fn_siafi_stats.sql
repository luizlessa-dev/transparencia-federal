CREATE OR REPLACE FUNCTION siafi_stats()
RETURNS TABLE(total_cnpjs bigint, total_pagamentos bigint, soma_brl numeric)
LANGUAGE sql STABLE AS $$
  SELECT
    COUNT(*)::bigint,
    SUM(n_pagamentos)::bigint,
    SUM(valor_total)
  FROM mv_siafi_fornecedores;
$$;
