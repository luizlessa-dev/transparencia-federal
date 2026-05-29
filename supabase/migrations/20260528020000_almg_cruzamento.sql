-- Transparência Federal — materialized view de cruzamento ALMG × Câmara × ALESP
--
-- CNPJs que aparecem na ALMG e em pelo menos uma outra casa (ALESP ou Câmara).
-- 2.362 CNPJs no total: 2.352 ALMG+Câmara, 83 ALMG+ALESP, 73 nas 3.
-- Refresh: chamar refresh_almg_fornecedores_intersetados() após ingestão mensal.

CREATE MATERIALIZED VIEW public.almg_fornecedores_intersetados AS
WITH

almg AS (
  SELECT
    g.cnpj_cpf                                    AS cnpj,
    MAX(g.fornecedor)                             AS nome,
    ROUND(SUM(g.valor_bruto)::numeric, 2)         AS total,
    COUNT(*)                                      AS notas,
    COUNT(DISTINCT g.parlamentar_id)              AS deputados
  FROM public.gastos_parlamentares g
  JOIN public.parlamentares_estaduais p ON p.id = g.parlamentar_id
  JOIN public.casas c ON c.id = p.casa_id
  WHERE c.sigla = 'ALMG'
    AND LENGTH(g.cnpj_cpf) = 14
    AND g.cnpj_cpf NOT SIMILAR TO '[0]{14}'
  GROUP BY g.cnpj_cpf
),

alesp AS (
  SELECT
    g.cnpj_cpf                                    AS cnpj,
    MAX(g.fornecedor)                             AS nome,
    ROUND(SUM(g.valor_bruto)::numeric, 2)         AS total,
    COUNT(*)                                      AS notas,
    COUNT(DISTINCT g.parlamentar_id)              AS deputados
  FROM public.gastos_parlamentares g
  JOIN public.parlamentares_estaduais p ON p.id = g.parlamentar_id
  JOIN public.casas c ON c.id = p.casa_id
  WHERE c.sigla = 'ALESP'
    AND LENGTH(g.cnpj_cpf) = 14
    AND g.cnpj_cpf NOT SIMILAR TO '[0]{14}'
  GROUP BY g.cnpj_cpf
),

camara AS (
  SELECT
    cnpj_cpf_fornecedor                           AS cnpj,
    MAX(nome_fornecedor)                          AS nome,
    ROUND(SUM(valor_liquido)::numeric, 2)         AS total,
    COUNT(*)                                      AS notas,
    COUNT(DISTINCT deputado_id_externo)           AS deputados
  FROM public.ceaps_brutas
  WHERE LENGTH(cnpj_cpf_fornecedor) = 14
    AND cnpj_cpf_fornecedor NOT SIMILAR TO '[0]{14}'
  GROUP BY cnpj_cpf_fornecedor
)

SELECT
  a.cnpj,
  UPPER(COALESCE(a.nome, al.nome, c.nome))        AS nome,

  a.total                                         AS total_almg,
  a.notas                                         AS notas_almg,
  a.deputados                                     AS deps_almg,

  al.total                                        AS total_alesp,
  al.notas                                        AS notas_alesp,
  al.deputados                                    AS deps_alesp,

  c.total                                         AS total_camara,
  c.notas                                         AS notas_camara,
  c.deputados                                     AS deps_camara,

  TRUE                                            AS em_almg,
  (al.cnpj IS NOT NULL)                           AS em_alesp,
  (c.cnpj  IS NOT NULL)                           AS em_camara,

  1 + (al.cnpj IS NOT NULL)::int
    + (c.cnpj  IS NOT NULL)::int                  AS n_casas,

  ROUND(
    a.total
    + COALESCE(al.total, 0)
    + COALESCE(c.total, 0),
    2
  )                                               AS total_geral

FROM almg a
LEFT JOIN alesp  al ON a.cnpj = al.cnpj
LEFT JOIN camara c  ON a.cnpj = c.cnpj
WHERE al.cnpj IS NOT NULL
   OR c.cnpj  IS NOT NULL
;

CREATE UNIQUE INDEX almg_fornecedores_intersetados_cnpj_idx
  ON public.almg_fornecedores_intersetados (cnpj);

CREATE INDEX almg_fornecedores_intersetados_total_idx
  ON public.almg_fornecedores_intersetados (total_geral DESC);

CREATE INDEX almg_fornecedores_intersetados_n_casas_idx
  ON public.almg_fornecedores_intersetados (n_casas DESC);

CREATE OR REPLACE FUNCTION public.refresh_almg_fornecedores_intersetados()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.almg_fornecedores_intersetados;
END;
$$;

COMMENT ON MATERIALIZED VIEW public.almg_fornecedores_intersetados IS
  'Fornecedores (CNPJ) presentes na ALMG e em ≥1 outra casa (ALESP ou Câmara Federal). '
  '2.362 CNPJs: 2.352 ALMG+Câmara, 83 ALMG+ALESP, 73 nas 3 casas. '
  'Chamar refresh_almg_fornecedores_intersetados() após cada ingestão mensal.';
