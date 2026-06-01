-- ─────────────────────────────────────────────────────────────────────────
-- mg_supersalarios — redefinir para usar SÓ o sinal oficial: abate_teto > 0.
--
-- Motivo: com remuneracao_base = bruto real (alto), o ramo "base > teto_referencia"
-- da coluna gerada passou a pescar VERBAS INDENIZATÓRIAS (auxílios/retroativos,
-- abate=0, IR/prev quase zero) — que NÃO contam pro teto. Esses não são
-- supersalário. O corte oficial (`abate_teto`) é a definição correta e defensável.
--
-- Operação LEVE: só recria a view (não reescreve a tabela nem mexe nas colunas
-- geradas — que ficam deprecadas; a generalização futura p/ exec_remuneracao
-- corrige as colunas sem rewrite extra). teto_referencia vira informativo.
-- ─────────────────────────────────────────────────────────────────────────

DROP VIEW IF EXISTS mg_supersalarios;

CREATE VIEW mg_supersalarios AS
SELECT orgao, servidor_nome, cargo, situacao,
       remuneracao_bruta, remuneracao_liquida,
       abate_teto,
       abate_teto AS valor_excedente,   -- o excedente = o que foi cortado
       servidor_id_externo, ano, mes, snapshot_mes
FROM mg_remuneracao_atual
WHERE COALESCE(abate_teto, 0) > 0
ORDER BY abate_teto DESC;

COMMENT ON VIEW mg_supersalarios IS
  'Servidores do Executivo de MG com abate-teto > 0 (corte oficial por exceder o teto), último snapshot. Ordenado pelo valor cortado.';
