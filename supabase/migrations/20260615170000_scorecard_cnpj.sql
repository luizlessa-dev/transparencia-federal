-- Scorecard unificado por CNPJ
-- Une: contratos federais + convênios + licitações PNCP + resultados PNCP + sanções + doações TSE
-- Chave de busca: cnpj (14 dígitos, sem formatação)

CREATE OR REPLACE VIEW vw_scorecard_cnpj AS
WITH

-- Contratos federais (fornecedor = quem recebeu o contrato)
contratos AS (
  SELECT
    REGEXP_REPLACE(cpf_cnpj, '[^0-9]', '', 'g')  AS cnpj,
    MAX(nome_fornecedor)                           AS nome,
    COUNT(*)                                       AS qtd_contratos,
    SUM(valor_inicial)                             AS valor_contratos,
    MIN(data_inicio)                               AS primeiro_contrato,
    MAX(data_inicio)                               AS ultimo_contrato,
    COUNT(DISTINCT orgao_nome)                     AS orgaos_contratos
  FROM contratos_federais
  WHERE cpf_cnpj IS NOT NULL
    AND LENGTH(REGEXP_REPLACE(cpf_cnpj, '[^0-9]', '', 'g')) = 14
  GROUP BY cnpj
),

-- Convênios (convenente = entidade que recebeu recursos)
convenios AS (
  SELECT
    REGEXP_REPLACE(convenente_cnpj, '[^0-9]', '', 'g') AS cnpj,
    MAX(convenente_nome)                                AS nome,
    COUNT(*)                                            AS qtd_convenios,
    SUM(valor)                                          AS valor_convenios,
    SUM(valor_liberado)                                 AS valor_liberado_convenios,
    MIN(data_publicacao)                                AS primeiro_convenio,
    MAX(data_publicacao)                                AS ultimo_convenio,
    COUNT(DISTINCT orgao_maximo_codigo)                 AS orgaos_convenios
  FROM convenios
  WHERE convenente_cnpj IS NOT NULL
    AND LENGTH(REGEXP_REPLACE(convenente_cnpj, '[^0-9]', '', 'g')) = 14
  GROUP BY cnpj
),

-- Licitações PNCP (fornecedor vencedor via resultados)
pncp AS (
  SELECT
    REGEXP_REPLACE(ni_fornecedor, '[^0-9]', '', 'g')  AS cnpj,
    MAX(nome_fornecedor)                               AS nome,
    COUNT(*)                                           AS qtd_licitacoes_vencidas,
    SUM(valor_total_homologado)                        AS valor_licitacoes,
    MIN(data_resultado_pncp)                           AS primeira_licitacao,
    MAX(data_resultado_pncp)                           AS ultima_licitacao,
    COUNT(DISTINCT orgao_cnpj)                         AS orgaos_licitacoes
  FROM pncp_resultados
  WHERE ni_fornecedor IS NOT NULL
    AND LENGTH(REGEXP_REPLACE(ni_fornecedor, '[^0-9]', '', 'g')) = 14
  GROUP BY cnpj
),

-- Sanções (CEIS/CNEP)
sancs AS (
  SELECT
    REGEXP_REPLACE(cpf_cnpj, '[^0-9]', '', 'g')   AS cnpj,
    COUNT(*)                                        AS qtd_sancoes,
    SUM(CASE WHEN ativo THEN 1 ELSE 0 END)          AS sancoes_ativas,
    MIN(data_inicio)                                AS primeira_sancao,
    MAX(data_inicio)                                AS ultima_sancao,
    STRING_AGG(DISTINCT tipo_sancao, ', ')
      FILTER (WHERE tipo_sancao IS NOT NULL)        AS tipos_sancao
  FROM portal_sancionados
  WHERE LENGTH(REGEXP_REPLACE(cpf_cnpj, '[^0-9]', '', 'g')) = 14
  GROUP BY cnpj
),

-- Doações TSE
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

-- União de todos os CNPJs conhecidos
todos AS (
  SELECT cnpj, nome FROM contratos
  UNION
  SELECT cnpj, nome FROM convenios
  UNION
  SELECT cnpj, nome FROM pncp
),

-- Nome mais frequente por CNPJ
nomes AS (
  SELECT DISTINCT ON (cnpj) cnpj, nome
  FROM todos
  WHERE nome IS NOT NULL
  ORDER BY cnpj, nome
)

SELECT
  n.cnpj,
  n.nome                              AS nome_fornecedor,

  -- Contratos federais
  c.qtd_contratos,
  c.valor_contratos,
  c.primeiro_contrato,
  c.ultimo_contrato,
  c.orgaos_contratos,

  -- Convênios
  v.qtd_convenios,
  v.valor_convenios,
  v.valor_liberado_convenios,
  v.primeiro_convenio,
  v.ultimo_convenio,
  v.orgaos_convenios,

  -- PNCP licitações vencidas
  p.qtd_licitacoes_vencidas,
  p.valor_licitacoes,
  p.primeira_licitacao,
  p.ultima_licitacao,
  p.orgaos_licitacoes,

  -- Totais agregados
  COALESCE(c.valor_contratos, 0) +
    COALESCE(v.valor_liberado_convenios, 0) +
    COALESCE(p.valor_licitacoes, 0)          AS valor_total_recebido,

  -- Sanções
  s.qtd_sancoes,
  s.sancoes_ativas,
  s.primeira_sancao,
  s.ultima_sancao,
  s.tipos_sancao,
  (s.cnpj IS NOT NULL)                       AS is_sancionado,
  (s.sancoes_ativas > 0)                     AS is_sancionado_ativo,

  -- Doações TSE
  t.qtd_doacoes,
  t.valor_doado,
  t.candidatos_distintos,
  t.eleicoes_distintas,
  t.primeira_eleicao_doada,
  t.ultima_eleicao_doada,
  t.candidatos_sample,
  (t.cnpj IS NOT NULL)                       AS is_doador_tse,

  -- Score de risco composto (0-4)
  -- +1 doador TSE, +1 sancionado, +2 sancionado ativo
  (CASE WHEN t.cnpj IS NOT NULL   THEN 1 ELSE 0 END +
   CASE WHEN s.cnpj IS NOT NULL   THEN 1 ELSE 0 END +
   CASE WHEN s.sancoes_ativas > 0 THEN 2 ELSE 0 END) AS risk_score

FROM nomes n
LEFT JOIN contratos c ON c.cnpj = n.cnpj
LEFT JOIN convenios v ON v.cnpj = n.cnpj
LEFT JOIN pncp      p ON p.cnpj = n.cnpj
LEFT JOIN sancs     s ON s.cnpj = n.cnpj
LEFT JOIN tse       t ON t.cnpj = n.cnpj;

-- MV para performance na busca por CNPJ
DROP MATERIALIZED VIEW IF EXISTS mv_scorecard_cnpj;

CREATE MATERIALIZED VIEW mv_scorecard_cnpj AS
SELECT * FROM vw_scorecard_cnpj;

CREATE UNIQUE INDEX idx_mv_scorecard_cnpj_cnpj
  ON mv_scorecard_cnpj (cnpj);

CREATE INDEX idx_mv_scorecard_cnpj_risk
  ON mv_scorecard_cnpj (risk_score DESC);

CREATE INDEX idx_mv_scorecard_cnpj_valor
  ON mv_scorecard_cnpj (valor_total_recebido DESC NULLS LAST);

CREATE INDEX idx_mv_scorecard_cnpj_sancionado
  ON mv_scorecard_cnpj (is_sancionado_ativo)
  WHERE is_sancionado_ativo = true;

CREATE INDEX idx_mv_scorecard_cnpj_doador
  ON mv_scorecard_cnpj (is_doador_tse)
  WHERE is_doador_tse = true;

GRANT SELECT ON vw_scorecard_cnpj    TO anon, authenticated;
GRANT SELECT ON mv_scorecard_cnpj    TO anon, authenticated;
