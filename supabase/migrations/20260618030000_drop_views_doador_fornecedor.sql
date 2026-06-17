-- Dropa duas views "doador/fornecedor × emenda" mortas no banco.
--
-- ele26_v_doador_emenda_hist (0 linhas) — tabela base `ele2026_financiamento`
-- está vazia (ingestão prematura). View recriada quando a ingestão rodar.
--
-- tse_v_fornecedor_emenda (0 linhas; timeout em count) — tese restritiva:
-- exigia mesmo parlamentar como autor da emenda e ex-comprador na campanha.
-- Validado em 2026-06-17: universo bruto existe (583 CNPJs comuns entre
-- tse_despesas 2022 e emendas_favorecidos), mas a amarração "mesmo deputado"
-- zera. Mesma doença que `tse_v_doador_emenda` antes do rewrite. Se for
-- útil depois, recriar como cruzamento amplo (sem amarrar parlamentar)
-- seguindo o padrão do rewrite 20260618010000.

DROP VIEW IF EXISTS public.ele26_v_doador_emenda_hist;
DROP VIEW IF EXISTS public.tse_v_fornecedor_emenda;
