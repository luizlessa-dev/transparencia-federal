-- Rewrite tse_v_doador_emenda — filtro `tipo_doador ILIKE '%jurídica%'` era inviável
--
-- Definição anterior cruzava `tse_receitas × emendas_favorecidos` exigindo que o
-- MESMO parlamentar fosse autor da emenda E recebedor da doação do CNPJ — match
-- inexistente pós-reforma 2015 (doação PJ→candidato banida; CNPJs em tse_receitas
-- são quase todos `Direção Estadual` / `Direção Nacional` / `Recursos de outros
-- candidatos`). Resultado: 0 linhas, view inútil.
--
-- A view nova:
--   1. Sem o filtro `tipo_doador ILIKE '%jurídica%'` (não existe esse valor).
--   2. Não exige mesmo parlamentar — junta no CNPJ apenas, agregando o lado TSE.
--   3. Cada linha = uma emenda PJ-favorecida, com perfil do CNPJ como doador
--      eleitoral (qtd doações, candidatos atendidos, eleições) caso aplique.
--
-- Cruzamento canônico fica em `vw_contratos_doadores_federal` / `mv_contratos_doadores_federal`
-- (TSE bruto × contratos federais × sanções por CNPJ); esta view aqui foca em
-- EMENDAS, não contratos.
--
-- Irmãs `ele26_v_doador_emenda_hist` e `tse_v_fornecedor_emenda` também eram 0
-- por bugs análogos — não tocadas aqui (decisão pendente: drop ou rewrite).

DROP VIEW IF EXISTS public.tse_v_doador_emenda;

CREATE VIEW public.tse_v_doador_emenda AS
WITH doador_agg AS (
  SELECT
    cpf_cnpj_doador AS cnpj,
    count(*)                                          AS qtd_doacoes,
    sum(valor)                                        AS valor_total_doado,
    count(DISTINCT cpf_candidato)                     AS candidatos_distintos,
    string_agg(DISTINCT ano_eleicao::text, ',' ORDER BY ano_eleicao::text) AS eleicoes_doadas,
    (string_agg(DISTINCT nome_doador, ' | '))         AS nome_doador_sample,
    (string_agg(DISTINCT setor_economico_doador, ' | ') FILTER (WHERE setor_economico_doador IS NOT NULL)) AS setor_doador_sample
  FROM public.tse_receitas
  WHERE length(cpf_cnpj_doador) = 14
  GROUP BY cpf_cnpj_doador
)
SELECT
  -- Lado emenda
  ef.codigo_autor                AS autor_codigo,
  ef.nome_autor                  AS autor_nome,
  ef.ano_emenda,
  ef.tipo_emenda,
  ef.subtipo,
  ef.codigo_favorecido           AS cnpj_favorecido,
  ef.favorecido                  AS nome_favorecido,
  ef.natureza_juridica           AS natureza_juridica_favorecido,
  ef.municipio_favorecido,
  ef.uf_favorecido,
  ef.valor_recebido              AS valor_emenda,
  -- Lado doação eleitoral
  d.qtd_doacoes,
  d.valor_total_doado,
  d.candidatos_distintos,
  d.eleicoes_doadas,
  d.nome_doador_sample,
  d.setor_doador_sample
FROM public.emendas_favorecidos ef
JOIN doador_agg d ON d.cnpj = ef.codigo_favorecido
WHERE length(ef.codigo_favorecido) = 14;

COMMENT ON VIEW public.tse_v_doador_emenda IS
  'Emendas PJ-favorecidas cruzadas com perfil de doação eleitoral do CNPJ '
  'agregado de tse_receitas. NÃO amarra ao mesmo parlamentar (cruzamento '
  'amplo, semelhante a mv_contratos_doadores_federal). Definição anterior '
  'filtrava por tipo_doador ILIKE ''%%jurídica%%'' — sem matches pós-reforma '
  '2015. Reescrita em 2026-06-17 (migration 20260618010000).';
