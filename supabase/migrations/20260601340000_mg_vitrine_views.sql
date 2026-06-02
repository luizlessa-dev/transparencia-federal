-- ─────────────────────────────────────────────────────────────────────────
-- Views de apoio à vitrine MG (agregação por CNPJ/autor p/ ranking eficiente
-- nas páginas, sem puxar dezenas de milhares de linhas no front).
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW mg_notas_fornecedor_total AS
SELECT cnpj_norm, max(nome) AS nome, sum(valor_total) AS valor_total, sum(n_notas) AS n_notas
FROM mg_notas_fornecedor
GROUP BY cnpj_norm;

CREATE OR REPLACE VIEW mg_compras_fornecedor_total AS
SELECT cnpj_norm, max(nome) AS nome, sum(vr_homologado) AS vr_homologado, sum(n_contratos) AS n_contratos
FROM mg_compras_fornecedor
GROUP BY cnpj_norm;

CREATE OR REPLACE VIEW mg_emendas_estaduais_por_autor AS
SELECT coalesce(autor, '(não informado)') AS autor, count(*)::int AS n, sum(vr_emenda) AS total
FROM mg_emendas_estaduais
GROUP BY 1;

-- resumos de 1 linha (KPIs sem puxar a tabela inteira)
CREATE OR REPLACE VIEW mg_notas_resumo AS
SELECT sum(valor_total) AS total, count(*)::int AS fornecedores, sum(n_notas)::bigint AS notas
FROM mg_notas_fornecedor_total;

CREATE OR REPLACE VIEW mg_compras_resumo AS
SELECT sum(vr_homologado) AS total, count(*)::int AS fornecedores, sum(n_contratos)::bigint AS contratos
FROM mg_compras_fornecedor_total;

CREATE OR REPLACE VIEW mg_emendas_estaduais_resumo AS
SELECT sum(vr_emenda) AS total, count(*)::int AS emendas, count(DISTINCT autor)::int AS autores
FROM mg_emendas_estaduais;

COMMENT ON VIEW mg_notas_fornecedor_total IS 'Notas fiscais somadas por fornecedor (CNPJ), todos os anos.';
COMMENT ON VIEW mg_compras_fornecedor_total IS 'Compras SIAD somadas por fornecedor (CNPJ), todos os anos.';
COMMENT ON VIEW mg_emendas_estaduais_por_autor IS 'Emendas estaduais somadas por autor (deputado/comissão/bloco).';
