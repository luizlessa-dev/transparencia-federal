-- ─────────────────────────────────────────────────────────────────────────
-- View mg_pagamentos_condenadas: empenhos pagos a empresas com decisão
-- CONDENATÓRIA (exclui arquivadas/absolvidas), com a conduta/decisão/fase
-- anexadas. Base única para a página /mg/pagamentos-sancionados e para o card
-- do painel — mesma régua editorial de mg_contratos_sancionados.
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW mg_pagamentos_condenadas AS
SELECT
  e.id, e.ano, e.numero_empenho, e.orgao, e.credor, e.cnpj_norm,
  e.elemento_despesa, e.fonte_recurso, e.data_registro, e.numero_processo,
  e.valor_empenhado, e.valor_liquidado, e.valor_pago,
  s.empresa  AS empresa_sancao,
  s.conduta, s.decisao, s.fase, s.valor_multa
FROM mg_empenhos_sancionados e
JOIN mg_empresas_sancionadas s ON s.cnpj_norm = e.cnpj_norm
WHERE s.decisao IS NOT NULL
  AND s.decisao !~* 'arquiv'
  AND s.decisao !~* 'absolv';

COMMENT ON VIEW mg_pagamentos_condenadas IS
  'Empenhos pagos a empresas CONDENADAS (transitado/condenatório, exclui arquivadas). Pagamento efetivo, não só contrato.';
