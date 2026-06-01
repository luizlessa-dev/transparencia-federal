-- ─────────────────────────────────────────────────────────────────────────
-- Views de sobrepreço em licitações:
--  • _rel       — itens "relevantes": exclui sobrepreço > 1000% (provável erro
--                 de cadastro do preço de referência) e valores não positivos.
--  • _por_ano   — resumo por ano (n itens, total de sobrepreço).
--  • _por_orgao — resumo por órgão homologador (n itens, total), maiores 1º.
-- Guardrail de qualidade: a cauda de % (até 26 milhões %) é lixo de referência
-- ínfima; o teto de 1000% mantém o sinal e tira o erro de digitação.
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW mg_licitacao_sobrepreco_rel AS
SELECT * FROM mg_licitacao_sobrepreco
WHERE sobrepreco_pct IS NOT NULL AND sobrepreco_pct <= 1000 AND sobrepreco_valor > 0;

CREATE OR REPLACE VIEW mg_licitacao_sobrepreco_por_ano AS
SELECT ano, count(*)::int AS n, sum(sobrepreco_valor) AS total
FROM mg_licitacao_sobrepreco_rel GROUP BY ano ORDER BY ano;

CREATE OR REPLACE VIEW mg_licitacao_sobrepreco_por_orgao AS
SELECT orgao, count(*)::int AS n, sum(sobrepreco_valor) AS total
FROM mg_licitacao_sobrepreco_rel GROUP BY orgao ORDER BY total DESC;

COMMENT ON VIEW mg_licitacao_sobrepreco_rel IS
  'Sobrepreço em licitações com teto de 1000% (exclui erro de referência). Sinal de apuração, não prova.';
