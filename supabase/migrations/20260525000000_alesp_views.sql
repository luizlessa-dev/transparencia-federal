-- Transparência Federal — views ALESP
--
-- Análogo às views ALMG (almg_deputados, almg_verba_indenizatoria,
-- almg_verba_resumo_mensal) — mas pra ALESP. Mesmas tabelas canônicas
-- (parlamentares_estaduais, gastos_parlamentares), apenas filtradas por
-- casa.sigla = 'ALESP'.
--
-- Nomenclatura: ALESP usa "despesas de gabinete" no portal oficial; o nome
-- das views reflete isso (em vez de "verba indenizatória" como na ALMG).
-- Colunas mantêm `valor_bruto`/`valor_reembolso` do canônico — pra ALESP
-- ambos são iguais (a casa não distingue).

-- ─── alesp_deputados (view) ────────────────────────────────────────────

CREATE OR REPLACE VIEW public.alesp_deputados AS
SELECT
  p.id_externo            AS matricula,
  p.nome,
  p.partido,
  p.tag_localizacao,
  p.foto_url,
  p.ativo,
  p.legislatura,
  p.metadata,
  p.ingested_at,
  p.updated_at
FROM public.parlamentares_estaduais p
JOIN public.casas c ON c.id = p.casa_id
WHERE c.sigla = 'ALESP';

COMMENT ON VIEW public.alesp_deputados IS
  'Deputados ALESP via tabela canônica `parlamentares_estaduais`. Inclui ativos da legislatura corrente e fantasmas (ativo=false) de legislaturas anteriores criados via backfill de despesas históricas.';

-- ─── alesp_despesas_gabinete (view) ────────────────────────────────────

CREATE OR REPLACE VIEW public.alesp_despesas_gabinete AS
SELECT
  g.id,
  p.id_externo            AS matricula,
  g.ano,
  g.mes,
  g.cod_categoria,
  g.categoria,
  g.fornecedor,
  g.cnpj_cpf,
  g.num_documento,
  g.data_emissao,
  g.valor_bruto           AS valor,        -- ALESP não distingue bruto/reembolso
  g.url_origem,
  g.metadata,
  g.ingested_at
FROM public.gastos_parlamentares g
JOIN public.parlamentares_estaduais p ON p.id = g.parlamentar_id
JOIN public.casas c ON c.id = p.casa_id
WHERE c.sigla = 'ALESP';

COMMENT ON VIEW public.alesp_despesas_gabinete IS
  'Despesas de gabinete ALESP (1 linha = 1 despesa). Granularidade: ano+mês, sem data exata nem nº documento — limitações da fonte ALESP.';

-- ─── alesp_despesas_resumo_mensal (view) ───────────────────────────────

CREATE OR REPLACE VIEW public.alesp_despesas_resumo_mensal AS
SELECT
  p.id_externo                AS matricula,
  p.nome,
  p.partido,
  p.ativo,
  p.legislatura,
  g.ano,
  g.mes,
  COUNT(*)                    AS qtd_despesas,
  COUNT(DISTINCT g.cnpj_cpf)  AS qtd_fornecedores,
  SUM(g.valor_bruto)          AS total
FROM public.gastos_parlamentares g
JOIN public.parlamentares_estaduais p ON p.id = g.parlamentar_id
JOIN public.casas c ON c.id = p.casa_id
WHERE c.sigla = 'ALESP'
GROUP BY p.id_externo, p.nome, p.partido, p.ativo, p.legislatura, g.ano, g.mes;

COMMENT ON VIEW public.alesp_despesas_resumo_mensal IS
  'Resumo mensal por deputado ALESP — equivalente ao almg_verba_resumo_mensal. Inclui ativo+legislatura pra filtrar fantasmas de legislaturas anteriores no front.';
