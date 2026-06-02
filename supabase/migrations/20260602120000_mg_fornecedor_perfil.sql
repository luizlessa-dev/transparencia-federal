-- ─────────────────────────────────────────────────────────────────────────
-- SCORECARD DE FORNECEDOR por CNPJ — o agregador-âncora do Executivo de MG.
--
-- Cruza, por cnpj_norm (só dígitos, 14 = PJ), TUDO que já está no banco sobre
-- cada empresa que fatura com o Estado de Minas:
--   • mg_contratos                 → valor contratado (Portal de Contratos)
--   • mg_compras_fornecedor_total  → vr_homologado (compras SIAD, agregado)
--   • mg_notas_fornecedor_total    → valor faturado em notas fiscais
--   • mg_empenhos_sancionados      → valor PAGO (só a sancionadas, enxuto)
--   • mg_licitacao_sobrepreco_rel  → itens/valor de sobrepreço (teto 1000%)
--   • mg_empresas_sancionadas      → condenada? conduta? decisão? fase?
--   • mg_terceirizados             → é terceirizada do Estado?
--   • mg_os_parcerias              → é organização social (OS/CG)?
--
-- + um SCORE DE RISCO transparente (0–100) = condenada + sobrepreço +
--   concentração por órgão.
--
-- ⚠️ CUIDADO EDITORIAL (mesma régua dos demais eixos):
--   • condenada ≠ arquivada. `condenada` exclui decisão com 'arquiv'/'absolv'.
--     Só `condenada = true` (transitado em julgado) sustenta acusação.
--   • sobrepreço e o próprio score são SINAL A APURAR, não prova: o preço de
--     referência pode estar subestimado; o órgão é o homologador; concentração
--     por órgão é esperada em estatais/fornecedores especializados.
--   • valor_faturado = MAIOR valor registrado em UM dos sistemas (contratos,
--     SIAD ou notas), NÃO a soma dos três — eles se sobrepõem e somá-los seria
--     dupla contagem. É a régua única de ranking "quem mais fatura".
--
-- Fonte: CKAN dados.mg.gov.br (CC-BY-4.0). PJ não é anonimizada na fonte.
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW mg_fornecedor_perfil AS
WITH contratos_agg AS (
  SELECT cnpj_norm,
         max(fornecedor)            AS nome_contrato,
         count(*)::int              AS n_contratos,
         sum(valor_total)           AS valor_contratado,
         count(DISTINCT orgao)::int AS n_orgaos
  FROM mg_contratos
  WHERE length(coalesce(cnpj_norm, '')) = 14
  GROUP BY cnpj_norm
),
-- concentração: órgão que mais paga o fornecedor (em valor de contrato)
contratos_top_orgao AS (
  SELECT DISTINCT ON (cnpj_norm)
         cnpj_norm,
         orgao                      AS orgao_principal,
         sum(valor_total)           AS valor_orgao_principal
  FROM mg_contratos
  WHERE length(coalesce(cnpj_norm, '')) = 14 AND orgao IS NOT NULL
  GROUP BY cnpj_norm, orgao
  ORDER BY cnpj_norm, sum(valor_total) DESC NULLS LAST
),
sobrepreco_agg AS (
  SELECT cnpj_norm,
         count(*)::int          AS sobrepreco_itens,
         sum(sobrepreco_valor)  AS sobrepreco_valor
  FROM mg_licitacao_sobrepreco_rel
  WHERE length(coalesce(cnpj_norm, '')) = 14
  GROUP BY cnpj_norm
),
empenho_agg AS (
  SELECT cnpj_norm,
         sum(valor_pago)  AS valor_pago_sancionado,
         count(*)::int    AS n_empenhos
  FROM mg_empenhos_sancionados
  WHERE length(coalesce(cnpj_norm, '')) = 14
  GROUP BY cnpj_norm
),
-- 1 linha por CNPJ na lista de sancionadas, priorizando a decisão condenatória
sanc AS (
  SELECT DISTINCT ON (cnpj_norm)
         cnpj_norm,
         empresa     AS nome_sancao,
         conduta,
         decisao,
         fase,
         valor_multa,
         (decisao IS NOT NULL AND decisao !~* 'arquiv' AND decisao !~* 'absolv') AS condenada
  FROM mg_empresas_sancionadas
  WHERE length(coalesce(cnpj_norm, '')) = 14
  ORDER BY cnpj_norm,
           (decisao IS NOT NULL AND decisao !~* 'arquiv' AND decisao !~* 'absolv') DESC,
           valor_multa DESC NULLS LAST
),
terc AS (
  SELECT cnpj_norm,
         max(empresa)            AS nome_terc,
         max(qtd_trabalhadores)  AS terc_qtd_max,
         max(mes_referencia)     AS terc_ultimo_mes
  FROM mg_terceirizados
  WHERE length(coalesce(cnpj_norm, '')) = 14
  GROUP BY cnpj_norm
),
os AS (
  SELECT DISTINCT ON (cnpj_norm)
         cnpj_norm,
         entidade          AS nome_os,
         tipo_instrumento  AS os_tipo
  FROM mg_os_parcerias
  WHERE length(coalesce(cnpj_norm, '')) = 14
  ORDER BY cnpj_norm, vr_repasse_atualizado DESC NULLS LAST
),
-- universo = qualquer CNPJ que aparece em alguma fonte de faturamento
base AS (
  SELECT cnpj_norm FROM contratos_agg
  UNION
  SELECT cnpj_norm FROM mg_compras_fornecedor_total WHERE length(coalesce(cnpj_norm, '')) = 14
  UNION
  SELECT cnpj_norm FROM mg_notas_fornecedor_total    WHERE length(coalesce(cnpj_norm, '')) = 14
),
joined AS (
  SELECT
    b.cnpj_norm,
    regexp_replace(b.cnpj_norm, '(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})', '\1.\2.\3/\4-\5') AS cnpj_fmt,
    coalesce(n.nome, co.nome, c.nome_contrato, s.nome_sancao, t.nome_terc, o.nome_os) AS fornecedor,

    -- faturamento por sistema (não somar entre si — ver nota de dupla contagem)
    coalesce(c.valor_contratado, 0)  AS valor_contratado,
    coalesce(c.n_contratos, 0)       AS n_contratos,
    coalesce(co.vr_homologado, 0)    AS valor_compras_siad,
    coalesce(co.n_contratos, 0)      AS n_compras,
    coalesce(n.valor_total, 0)       AS valor_notas,
    coalesce(n.n_notas, 0)           AS n_notas,
    greatest(coalesce(c.valor_contratado, 0),
             coalesce(co.vr_homologado, 0),
             coalesce(n.valor_total, 0))  AS valor_faturado,

    -- concentração por órgão (sobre contratos)
    coalesce(c.n_orgaos, 0)          AS n_orgaos,
    cto.orgao_principal,
    CASE WHEN coalesce(c.valor_contratado, 0) > 0
         THEN round(cto.valor_orgao_principal / c.valor_contratado, 4)
         ELSE NULL END               AS concentracao_orgao,

    -- pagamento efetivo (só populado p/ sancionadas, base enxuta)
    coalesce(ea.valor_pago_sancionado, 0) AS valor_pago_sancionado,
    coalesce(ea.n_empenhos, 0)            AS n_empenhos_sancionado,

    -- sobrepreço em licitação
    coalesce(sp.sobrepreco_itens, 0) AS sobrepreco_itens,
    coalesce(sp.sobrepreco_valor, 0) AS sobrepreco_valor,

    -- sanção (régua condenada ≠ arquivada)
    (s.cnpj_norm IS NOT NULL)        AS processada,
    coalesce(s.condenada, false)     AS condenada,
    s.conduta,
    s.decisao,
    s.fase,
    s.valor_multa,

    -- vínculos estruturais
    (t.cnpj_norm IS NOT NULL)        AS terceirizada,
    t.terc_qtd_max,
    (o.cnpj_norm IS NOT NULL)        AS organizacao_social,
    o.os_tipo
  FROM base b
  LEFT JOIN contratos_agg            c   ON c.cnpj_norm  = b.cnpj_norm
  LEFT JOIN contratos_top_orgao      cto ON cto.cnpj_norm = b.cnpj_norm
  LEFT JOIN mg_compras_fornecedor_total co ON co.cnpj_norm = b.cnpj_norm
  LEFT JOIN mg_notas_fornecedor_total   n  ON n.cnpj_norm  = b.cnpj_norm
  LEFT JOIN sobrepreco_agg           sp  ON sp.cnpj_norm = b.cnpj_norm
  LEFT JOIN empenho_agg              ea  ON ea.cnpj_norm = b.cnpj_norm
  LEFT JOIN sanc                     s   ON s.cnpj_norm  = b.cnpj_norm
  LEFT JOIN terc                     t   ON t.cnpj_norm  = b.cnpj_norm
  LEFT JOIN os                       o   ON o.cnpj_norm  = b.cnpj_norm
)
SELECT
  j.*,
  -- ── componentes do SCORE DE RISCO (transparentes, 0–100) ─────────────────
  -- condenada (transitado em julgado) é o único fato duro → peso dominante
  (CASE WHEN j.condenada THEN 50 ELSE 0 END)                               AS risco_condenada,
  -- sobrepreço homologado acima da referência → sinal a apurar
  (CASE WHEN j.sobrepreco_valor >= 1000000 THEN 30
        WHEN j.sobrepreco_valor > 0        THEN 15
        ELSE 0 END)                                                        AS risco_sobrepreco,
  -- dependência de um único órgão (só conta com contrato relevante) → contexto
  (CASE WHEN j.valor_contratado >= 1000000 AND j.concentracao_orgao >= 0.95 THEN 15
        WHEN j.valor_contratado >= 1000000 AND j.concentracao_orgao >= 0.80 THEN 10
        WHEN j.valor_contratado >= 1000000 AND j.concentracao_orgao >= 0.60 THEN 5
        ELSE 0 END)                                                        AS risco_concentracao,
  least(100,
    (CASE WHEN j.condenada THEN 50 ELSE 0 END)
    + (CASE WHEN j.sobrepreco_valor >= 1000000 THEN 30
            WHEN j.sobrepreco_valor > 0        THEN 15
            ELSE 0 END)
    + (CASE WHEN j.valor_contratado >= 1000000 AND j.concentracao_orgao >= 0.95 THEN 15
            WHEN j.valor_contratado >= 1000000 AND j.concentracao_orgao >= 0.80 THEN 10
            WHEN j.valor_contratado >= 1000000 AND j.concentracao_orgao >= 0.60 THEN 5
            ELSE 0 END)
  )                                                                        AS risco_score,
  (CASE
     WHEN j.condenada THEN 'alto'
     WHEN (CASE WHEN j.sobrepreco_valor >= 1000000 THEN 30 WHEN j.sobrepreco_valor > 0 THEN 15 ELSE 0 END)
          + (CASE WHEN j.valor_contratado >= 1000000 AND j.concentracao_orgao >= 0.95 THEN 15
                  WHEN j.valor_contratado >= 1000000 AND j.concentracao_orgao >= 0.80 THEN 10
                  WHEN j.valor_contratado >= 1000000 AND j.concentracao_orgao >= 0.60 THEN 5
                  ELSE 0 END) >= 25 THEN 'medio'
     WHEN (CASE WHEN j.sobrepreco_valor >= 1000000 THEN 30 WHEN j.sobrepreco_valor > 0 THEN 15 ELSE 0 END)
          + (CASE WHEN j.valor_contratado >= 1000000 AND j.concentracao_orgao >= 0.95 THEN 15
                  WHEN j.valor_contratado >= 1000000 AND j.concentracao_orgao >= 0.80 THEN 10
                  WHEN j.valor_contratado >= 1000000 AND j.concentracao_orgao >= 0.60 THEN 5
                  ELSE 0 END) >= 10 THEN 'baixo'
     ELSE NULL
   END)                                                                    AS risco_label
FROM joined j;

COMMENT ON VIEW mg_fornecedor_perfil IS
  'Scorecard por fornecedor (cnpj_norm) do Executivo de MG: faturamento em contratos/SIAD/notas, pago a sancionadas, sobrepreço, sanção (condenada≠arquivada), terceirizada, OS, e score de risco 0–100 (condenada+sobrepreço+concentração). valor_faturado = maior valor em UM sistema (não soma). Score/sobrepreço = sinal a apurar.';

-- ── resumo de 1 linha p/ KPIs da página (sem puxar 17k linhas) ─────────────
CREATE OR REPLACE VIEW mg_fornecedor_perfil_resumo AS
SELECT
  count(*)::int                                            AS fornecedores,
  count(*) FILTER (WHERE condenada)::int                   AS condenadas_faturando,
  coalesce(sum(valor_pago_sancionado) FILTER (WHERE condenada), 0) AS pago_a_condenadas,
  count(*) FILTER (WHERE sobrepreco_valor > 0)::int        AS com_sobrepreco,
  coalesce(sum(sobrepreco_valor), 0)                       AS sobrepreco_total,
  count(*) FILTER (WHERE risco_label = 'alto')::int        AS risco_alto,
  coalesce(max(valor_faturado), 0)                         AS maior_faturamento
FROM mg_fornecedor_perfil;

COMMENT ON VIEW mg_fornecedor_perfil_resumo IS
  'KPIs do scorecard de fornecedores MG: nº de fornecedores, condenadas faturando, pago a condenadas, com sobrepreço, score alto.';
