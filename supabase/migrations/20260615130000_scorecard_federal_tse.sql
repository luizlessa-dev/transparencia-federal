-- Enriquece o scorecard federal com doações TSE (empresa doadora × convenente)
-- Substitui vw_scorecard_fornecedor_federal e recria a MV com os novos campos.

CREATE OR REPLACE VIEW vw_scorecard_fornecedor_federal AS
WITH convs AS (
  SELECT
    REGEXP_REPLACE(convenente_cnpj, '[^0-9]', '', 'g') AS cnpj,
    MAX(convenente_nome)                AS convenente_nome,
    COUNT(*)                            AS qtd_convenios,
    SUM(valor)                          AS valor_total,
    SUM(valor_liberado)                 AS valor_liberado,
    MIN(data_publicacao)                AS primeiro_convenio,
    MAX(data_publicacao)                AS ultimo_convenio,
    COUNT(DISTINCT uf)                  AS ufs_distintas,
    COUNT(DISTINCT orgao_maximo_codigo) AS orgaos_distintos
  FROM convenios
  WHERE convenente_cnpj IS NOT NULL
    AND LENGTH(REGEXP_REPLACE(convenente_cnpj, '[^0-9]', '', 'g')) = 14
  GROUP BY cnpj
),
sancs AS (
  SELECT
    REGEXP_REPLACE(cpf_cnpj, '[^0-9]', '', 'g') AS cnpj,
    COUNT(*)                                      AS qtd_sancoes,
    SUM(CASE WHEN ativo THEN 1 ELSE 0 END)        AS sancoes_ativas,
    MIN(data_inicio)                              AS primeira_sancao,
    MAX(data_inicio)                              AS ultima_sancao
  FROM portal_sancionados
  WHERE LENGTH(REGEXP_REPLACE(cpf_cnpj, '[^0-9]', '', 'g')) = 14
  GROUP BY cnpj
),
-- Agrega doações por CNPJ doador: total doado, candidatos distintos, anos eleitorais
tse AS (
  SELECT
    REGEXP_REPLACE(nr_cpf_cnpj_doador, '[^0-9]', '', 'g') AS cnpj,
    COUNT(*)                                               AS qtd_doacoes,
    SUM(vr_receita)                                        AS valor_doado,
    COUNT(DISTINCT nr_cpf_candidato)                       AS candidatos_distintos,
    COUNT(DISTINCT ano_eleicao)                            AS eleicoes_distintas,
    MIN(ano_eleicao)                                       AS primeira_eleicao_doada,
    MAX(ano_eleicao)                                       AS ultima_eleicao_doada,
    -- Candidatos beneficiados (primeiros 5, concatenados)
    STRING_AGG(DISTINCT nm_candidato, ' | ' ORDER BY nm_candidato)
      FILTER (WHERE nm_candidato IS NOT NULL)              AS candidatos_sample
  FROM tse_receitas_brutas
  WHERE LENGTH(REGEXP_REPLACE(nr_cpf_cnpj_doador, '[^0-9]', '', 'g')) = 14
  GROUP BY cnpj
)
SELECT
  c.cnpj,
  c.convenente_nome,
  c.qtd_convenios,
  c.valor_total,
  c.valor_liberado,
  c.primeiro_convenio,
  c.ultimo_convenio,
  c.ufs_distintas,
  c.orgaos_distintos,
  -- Sanções
  s.qtd_sancoes,
  s.sancoes_ativas,
  s.primeira_sancao,
  s.ultima_sancao,
  (s.cnpj IS NOT NULL)    AS is_sancionado,
  (s.sancoes_ativas > 0)  AS is_sancionado_ativo,
  -- Doações TSE
  t.qtd_doacoes,
  t.valor_doado,
  t.candidatos_distintos,
  t.eleicoes_distintas,
  t.primeira_eleicao_doada,
  t.ultima_eleicao_doada,
  t.candidatos_sample,
  (t.cnpj IS NOT NULL)    AS is_doador_tse
FROM convs c
LEFT JOIN sancs s ON s.cnpj = c.cnpj
LEFT JOIN tse   t ON t.cnpj = c.cnpj
ORDER BY c.valor_total DESC NULLS LAST;

-- Recria MV com novos campos
DROP MATERIALIZED VIEW IF EXISTS mv_scorecard_fornecedor_federal;

CREATE MATERIALIZED VIEW mv_scorecard_fornecedor_federal AS
SELECT * FROM vw_scorecard_fornecedor_federal;

CREATE UNIQUE INDEX idx_mv_scorecard_fed_cnpj
  ON mv_scorecard_fornecedor_federal (cnpj);

CREATE INDEX idx_mv_scorecard_fed_sancionado
  ON mv_scorecard_fornecedor_federal (is_sancionado_ativo)
  WHERE is_sancionado_ativo = true;

CREATE INDEX idx_mv_scorecard_fed_doador
  ON mv_scorecard_fornecedor_federal (is_doador_tse)
  WHERE is_doador_tse = true;

GRANT SELECT ON vw_scorecard_fornecedor_federal TO anon, authenticated;
GRANT SELECT ON mv_scorecard_fornecedor_federal TO anon, authenticated;
