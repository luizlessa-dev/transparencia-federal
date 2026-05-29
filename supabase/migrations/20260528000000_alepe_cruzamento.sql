-- Transparência Federal — view de cruzamento ALEPE × Câmara × ALESP
--
-- Foco: CNPJs que aparecem na ALEPE E em pelo menos uma das demais casas.
-- Exclui CPFs (14 dígitos = CNPJ; 11 dígitos = CPF).
-- Exclui CNPJs com dígitos uniformes (ex: 00000000000000) que são placeholders.
--
-- Colunas-chave:
--   em_alepe / em_alesp / em_camara  → boolean, permite filtrar combinações
--   n_casas                          → 2 ou 3; útil para ordenar por relevância
--   total_geral                      → soma nominal em R$ de todas as casas

CREATE OR REPLACE VIEW public.fornecedores_intersetados AS
WITH

-- ── ALEPE ────────────────────────────────────────────────────────────────────
alepe AS (
  SELECT
    cnpj_cpf                                      AS cnpj,
    MAX(fornecedor)                               AS nome,
    ROUND(SUM(valor)::numeric, 2)                 AS total,
    COUNT(*)                                      AS notas,
    COUNT(DISTINCT id_alepe)                      AS deputados
  FROM public.alepe_verba_indenizatoria
  WHERE LENGTH(cnpj_cpf) = 14
    AND cnpj_cpf NOT SIMILAR TO '[0]{14}'
  GROUP BY cnpj_cpf
),

-- ── ALESP ────────────────────────────────────────────────────────────────────
alesp AS (
  SELECT
    cnpj_cpf                                      AS cnpj,
    MAX(fornecedor)                               AS nome,
    ROUND(SUM(valor)::numeric, 2)                 AS total,
    COUNT(*)                                      AS notas,
    COUNT(DISTINCT matricula)                     AS deputados
  FROM public.alesp_despesas_gabinete
  WHERE LENGTH(cnpj_cpf) = 14
    AND cnpj_cpf NOT SIMILAR TO '[0]{14}'
  GROUP BY cnpj_cpf
),

-- ── Câmara Federal (CEAP) ────────────────────────────────────────────────────
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

-- ── Cruzamento — só CNPJs presentes na ALEPE + ≥1 outra casa ────────────────
SELECT
  a.cnpj,
  -- Nome mais legível: preferência ALEPE (já normalizado), fallback ALESP/Câmara
  UPPER(COALESCE(a.nome, al.nome, c.nome))        AS nome,

  -- ALEPE (sempre presente neste filtro)
  a.total                                          AS total_alepe,
  a.notas                                         AS notas_alepe,
  a.deputados                                     AS deps_alepe,

  -- ALESP
  al.total                                        AS total_alesp,
  al.notas                                        AS notas_alesp,
  al.deputados                                    AS deps_alesp,

  -- Câmara Federal
  c.total                                         AS total_camara,
  c.notas                                         AS notas_camara,
  c.deputados                                     AS deps_camara,

  -- Flags de presença
  TRUE                                            AS em_alepe,
  (al.cnpj IS NOT NULL)                           AS em_alesp,
  (c.cnpj IS NOT NULL)                            AS em_camara,

  -- Número de casas (2 ou 3)
  1 + (al.cnpj IS NOT NULL)::int
    + (c.cnpj IS NOT NULL)::int                   AS n_casas,

  -- Total geral
  ROUND(
    a.total
    + COALESCE(al.total, 0)
    + COALESCE(c.total, 0),
    2
  )                                               AS total_geral

FROM alepe a
LEFT JOIN alesp  al ON a.cnpj = al.cnpj
LEFT JOIN camara c  ON a.cnpj = c.cnpj
WHERE al.cnpj IS NOT NULL
   OR c.cnpj  IS NOT NULL
;

COMMENT ON VIEW public.fornecedores_intersetados IS
  'Fornecedores (CNPJ) presentes na ALEPE e em pelo menos uma outra casa '
  '(ALESP e/ou Câmara Federal). Valores em R$ nominais. '
  'Use n_casas=3 para os que aparecem nas três casas, em_camara/em_alesp para filtros.';
