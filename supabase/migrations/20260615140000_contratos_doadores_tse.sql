-- Cruzamento: contratos federais × doadores TSE × sancionados
-- Empresas privadas que recebem contratos federais E doaram para campanhas.
-- Sinal de "pay to play": doação → contrato.

CREATE OR REPLACE VIEW vw_contratos_doadores_federal AS
WITH contratos AS (
  SELECT
    REGEXP_REPLACE(cpf_cnpj, '[^0-9]', '', 'g')  AS cnpj,
    MAX(nome_fornecedor)                           AS nome_fornecedor,
    COUNT(*)                                       AS qtd_contratos,
    SUM(valor_inicial)                             AS valor_contratos,
    MIN(data_inicio)                               AS primeiro_contrato,
    MAX(data_inicio)                               AS ultimo_contrato,
    COUNT(DISTINCT orgao_nome)                     AS orgaos_distintos
  FROM contratos_federais
  WHERE cpf_cnpj IS NOT NULL
    AND LENGTH(REGEXP_REPLACE(cpf_cnpj, '[^0-9]', '', 'g')) = 14
  GROUP BY cnpj
),
tse AS (
  SELECT
    REGEXP_REPLACE(nr_cpf_cnpj_doador, '[^0-9]', '', 'g') AS cnpj,
    COUNT(*)                                               AS qtd_doacoes,
    SUM(vr_receita)                                        AS valor_doado,
    COUNT(DISTINCT nr_cpf_candidato)                       AS candidatos_distintos,
    COUNT(DISTINCT ano_eleicao)                            AS eleicoes_distintas,
    MIN(ano_eleicao)                                       AS primeira_eleicao_doada,
    MAX(ano_eleicao)                                       AS ultima_eleicao_doada,
    STRING_AGG(DISTINCT nm_candidato, ' | ' ORDER BY nm_candidato)
      FILTER (WHERE nm_candidato IS NOT NULL)              AS candidatos_sample
  FROM tse_receitas_brutas
  WHERE LENGTH(REGEXP_REPLACE(nr_cpf_cnpj_doador, '[^0-9]', '', 'g')) = 14
  GROUP BY cnpj
),
sancs AS (
  SELECT
    REGEXP_REPLACE(cpf_cnpj, '[^0-9]', '', 'g') AS cnpj,
    COUNT(*)                                      AS qtd_sancoes,
    SUM(CASE WHEN ativo THEN 1 ELSE 0 END)        AS sancoes_ativas
  FROM portal_sancionados
  WHERE LENGTH(REGEXP_REPLACE(cpf_cnpj, '[^0-9]', '', 'g')) = 14
  GROUP BY cnpj
)
SELECT
  c.cnpj,
  c.nome_fornecedor,
  -- Contratos
  c.qtd_contratos,
  c.valor_contratos,
  c.primeiro_contrato,
  c.ultimo_contrato,
  c.orgaos_distintos,
  -- Doações TSE
  t.qtd_doacoes,
  t.valor_doado,
  t.candidatos_distintos,
  t.eleicoes_distintas,
  t.primeira_eleicao_doada,
  t.ultima_eleicao_doada,
  t.candidatos_sample,
  (t.cnpj IS NOT NULL)   AS is_doador_tse,
  -- Sanções
  s.qtd_sancoes,
  s.sancoes_ativas,
  (s.cnpj IS NOT NULL)   AS is_sancionado,
  (s.sancoes_ativas > 0) AS is_sancionado_ativo,
  -- Score de risco composto (0-3)
  (CASE WHEN t.cnpj IS NOT NULL   THEN 1 ELSE 0 END +
   CASE WHEN s.sancoes_ativas > 0 THEN 2 ELSE 0 END) AS risk_score
FROM contratos c
LEFT JOIN tse   t ON t.cnpj = c.cnpj
LEFT JOIN sancs s ON s.cnpj = c.cnpj
ORDER BY risk_score DESC, c.valor_contratos DESC NULLS LAST;

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_contratos_doadores_federal AS
SELECT * FROM vw_contratos_doadores_federal;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_contratos_doad_cnpj
  ON mv_contratos_doadores_federal (cnpj);

CREATE INDEX IF NOT EXISTS idx_mv_contratos_doad_risk
  ON mv_contratos_doadores_federal (risk_score DESC);

CREATE INDEX IF NOT EXISTS idx_mv_contratos_doad_doador
  ON mv_contratos_doadores_federal (is_doador_tse)
  WHERE is_doador_tse = true;

GRANT SELECT ON vw_contratos_doadores_federal TO anon, authenticated;
GRANT SELECT ON mv_contratos_doadores_federal TO anon, authenticated;
