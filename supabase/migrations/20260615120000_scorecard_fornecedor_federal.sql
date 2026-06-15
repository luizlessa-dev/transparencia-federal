-- Scorecard de fornecedores federais: convenios × sancionados (CEIS/CNEP)
-- Normaliza CNPJs removendo formatação antes de cruzar.

CREATE OR REPLACE VIEW vw_scorecard_fornecedor_federal AS
WITH convs AS (
  SELECT
    REGEXP_REPLACE(convenente_cnpj, '[^0-9]', '', 'g') AS cnpj,
    MAX(convenente_nome)                  AS convenente_nome,
    COUNT(*)                              AS qtd_convenios,
    SUM(valor)                            AS valor_total,
    SUM(valor_liberado)                   AS valor_liberado,
    MIN(data_publicacao)                  AS primeiro_convenio,
    MAX(data_publicacao)                  AS ultimo_convenio,
    COUNT(DISTINCT uf)                    AS ufs_distintas,
    COUNT(DISTINCT orgao_maximo_codigo)   AS orgaos_distintos
  FROM convenios
  WHERE convenente_cnpj IS NOT NULL
    AND LENGTH(REGEXP_REPLACE(convenente_cnpj, '[^0-9]', '', 'g')) = 14
  GROUP BY cnpj
),
sancs AS (
  SELECT
    REGEXP_REPLACE(cpf_cnpj, '[^0-9]', '', 'g') AS cnpj,
    nome                                          AS nome_sancionado,
    COUNT(*)                                      AS qtd_sancoes,
    SUM(CASE WHEN ativo THEN 1 ELSE 0 END)        AS sancoes_ativas,
    MIN(data_inicio)                              AS primeira_sancao,
    MAX(data_inicio)                              AS ultima_sancao
  FROM portal_sancionados
  WHERE LENGTH(REGEXP_REPLACE(cpf_cnpj, '[^0-9]', '', 'g')) = 14
  GROUP BY cnpj, nome
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
  s.qtd_sancoes,
  s.sancoes_ativas,
  s.primeira_sancao,
  s.ultima_sancao,
  (s.cnpj IS NOT NULL)         AS is_sancionado,
  (s.sancoes_ativas > 0)       AS is_sancionado_ativo
FROM convs c
LEFT JOIN sancs s ON s.cnpj = c.cnpj
ORDER BY c.valor_total DESC NULLS LAST;

-- Materializa para performance (refresh manual ou via cron)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_scorecard_fornecedor_federal AS
SELECT * FROM vw_scorecard_fornecedor_federal;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_scorecard_fed_cnpj
  ON mv_scorecard_fornecedor_federal (cnpj);

CREATE INDEX IF NOT EXISTS idx_mv_scorecard_fed_sancionado
  ON mv_scorecard_fornecedor_federal (is_sancionado_ativo)
  WHERE is_sancionado_ativo = true;

GRANT SELECT ON vw_scorecard_fornecedor_federal TO anon, authenticated;
GRANT SELECT ON mv_scorecard_fornecedor_federal TO anon, authenticated;
