-- ─────────────────────────────────────────────────────────────────────────
-- Refina mg_contratos_sancionados: distinguir CONDENADA de ARQUIVADA.
--
-- O dataset "empresas_sancionadas" da CGE lista empresas PROCESSADAS — inclui
-- casos ARQUIVADOS (encerrados sem punição / possível absolvição). Rotular uma
-- empresa arquivada como "sancionada" é factualmente errado e difamatório.
-- O campo `decisao` distingue: "...condenatória/Multa/Inidoneidade" = punida;
-- "ARQUIVAMENTO" = não punida.
--
-- Adiciona coluna `condenada` (bool) e ordena condenadas primeiro. A página
-- deve liderar SÓ por condenada = true.
-- ─────────────────────────────────────────────────────────────────────────

DROP VIEW IF EXISTS mg_contratos_sancionados;

CREATE VIEW mg_contratos_sancionados AS
SELECT
  c.fornecedor,
  c.cnpj_fmt,
  c.orgao,
  c.objeto,
  c.valor_total,
  c.numero_contrato,
  c.situacao,
  c.data_assinatura,
  c.data_termino,
  s.conduta,
  s.decisao,
  s.fase,
  s.valor_multa,
  s.orgao_lesado,
  s.data_publicacao_decisao,
  -- condenada: tem decisão e NÃO é arquivamento/absolvição
  (
    s.decisao IS NOT NULL
    AND s.decisao !~* 'arquiv'
    AND s.decisao !~* 'absolv'
  ) AS condenada,
  c.cnpj_norm
FROM mg_contratos c
JOIN mg_empresas_sancionadas s
  ON s.cnpj_norm = c.cnpj_norm
 AND length(coalesce(c.cnpj_norm, '')) = 14
ORDER BY condenada DESC, c.valor_total DESC NULLS LAST;

COMMENT ON VIEW mg_contratos_sancionados IS
  'Contratos do Estado de MG cujo fornecedor (CNPJ) foi processado por sanção. condenada=true exclui arquivados/absolvidos — usar este recorte para publicar nomes.';
