-- Transparência Federal — views ALEPE
--
-- Análogo às views ALMG/ALESP — filtradas por casa.sigla = 'ALEPE'.
-- ALEPE tem `data_emissao` (data exata da nota) e `cod_categoria` (rubrica 1–15),
-- o que a diferencia da ALESP (sem data, sem nº documento).

-- ─── alepe_deputados ───────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.alepe_deputados AS
SELECT
  p.id_externo::INTEGER   AS id_alepe,
  p.nome,
  p.partido,
  p.ativo,
  p.legislatura,
  p.metadata,
  p.ingested_at,
  p.updated_at
FROM public.parlamentares_estaduais p
JOIN public.casas c ON c.id = p.casa_id
WHERE c.sigla = 'ALEPE';

COMMENT ON VIEW public.alepe_deputados IS
  'Deputados ALEPE via tabela canônica `parlamentares_estaduais`. 49 ativos (leg=17) + 114 históricos (leg=-16).';

-- ─── alepe_verba_indenizatoria ─────────────────────────────────────────────

CREATE OR REPLACE VIEW public.alepe_verba_indenizatoria AS
SELECT
  g.id,
  p.id_externo::INTEGER   AS id_alepe,
  g.ano,
  g.mes,
  g.cod_categoria,
  g.categoria,
  g.fornecedor,
  g.cnpj_cpf,
  g.data_emissao,
  g.valor_bruto           AS valor,
  g.metadata,
  g.ingested_at
FROM public.gastos_parlamentares g
JOIN public.parlamentares_estaduais p ON p.id = g.parlamentar_id
JOIN public.casas c ON c.id = p.casa_id
WHERE c.sigla = 'ALEPE';

COMMENT ON VIEW public.alepe_verba_indenizatoria IS
  'Notas de verba indenizatória ALEPE — 1 linha = 1 nota fiscal. Inclui data_emissao (disponível na API ALEPE, diferente da ALESP).';

-- ─── alepe_verba_resumo_mensal ─────────────────────────────────────────────

CREATE OR REPLACE VIEW public.alepe_verba_resumo_mensal AS
SELECT
  p.id_externo::INTEGER       AS id_alepe,
  p.nome,
  p.partido,
  p.ativo,
  p.legislatura,
  g.ano,
  g.mes,
  COUNT(*)                    AS qtd_notas,
  COUNT(DISTINCT g.cnpj_cpf)  AS qtd_fornecedores,
  SUM(g.valor_bruto)          AS total
FROM public.gastos_parlamentares g
JOIN public.parlamentares_estaduais p ON p.id = g.parlamentar_id
JOIN public.casas c ON c.id = p.casa_id
WHERE c.sigla = 'ALEPE'
GROUP BY p.id_externo, p.nome, p.partido, p.ativo, p.legislatura, g.ano, g.mes;

COMMENT ON VIEW public.alepe_verba_resumo_mensal IS
  'Resumo mensal por deputado ALEPE — equivalente ao almg_verba_resumo_mensal. Inclui ativo+legislatura pra filtrar históricos no front.';
