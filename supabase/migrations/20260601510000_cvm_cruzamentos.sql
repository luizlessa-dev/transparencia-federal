-- ───────────────────────────────────────────────────────────────────────────
-- CVM — motor de grafo re-semeável + cruzamentos.
--   • cvm_grafo_vizinhanca(cnpj, prof): walk recursivo (objetivo #1).
--   • cvm_emissor_sancionado: oferta × sancionadas federal + MG (objetivo #3).
-- (O cross sócio × político (#2) vem na migration da Receita, quando houver QSA.)
-- ───────────────────────────────────────────────────────────────────────────

-- Motor de grafo: dada uma semente (CNPJ de fundo), devolve a vizinhança até
-- `prof` saltos, nas duas direções (downstream = o que detém; upstream = quem o
-- detém). Re-semeável: serve pra qualquer CNPJ, não só o caso Galo Forte.
create or replace function cvm_grafo_vizinhanca(p_cnpj text, p_prof int default 3)
returns table (
  cnpj_origem  text,
  cnpj_destino text,
  denom_destino text,
  vl_merc      numeric,
  profundidade int,
  direcao      text
)
language sql stable as $$
  with recursive
  base as (
    select regexp_replace(coalesce(p_cnpj,''), '\D', '', 'g') as c
  ),
  -- downstream: seed → o que ele detém → ...
  down as (
    select e.cnpj_fundo as cnpj_origem, e.cnpj_ativo as cnpj_destino,
           e.denom_ativo as denom_destino, e.vl_merc, 1 as profundidade
    from cvm_carteira_edge e, base
    where e.cnpj_fundo = base.c
    union all
    select e.cnpj_fundo, e.cnpj_ativo, e.denom_ativo, e.vl_merc, d.profundidade + 1
    from cvm_carteira_edge e
    join down d on e.cnpj_fundo = d.cnpj_destino
    where d.profundidade < p_prof
  ),
  -- upstream: quem detém o seed → quem detém esse → ...
  up as (
    select e.cnpj_fundo as cnpj_origem, e.cnpj_ativo as cnpj_destino,
           e.denom_ativo as denom_destino, e.vl_merc, 1 as profundidade
    from cvm_carteira_edge e, base
    where e.cnpj_ativo = base.c
    union all
    select e.cnpj_fundo, e.cnpj_ativo, e.denom_ativo, e.vl_merc, u.profundidade + 1
    from cvm_carteira_edge e
    join up u on e.cnpj_ativo = u.cnpj_origem
    where u.profundidade < p_prof
  )
  select cnpj_origem, cnpj_destino, denom_destino, vl_merc, profundidade, 'downstream' from down
  union all
  select cnpj_origem, cnpj_destino, denom_destino, vl_merc, profundidade, 'upstream' from up;
$$;

-- Cross #3 — emissores de oferta pública que também são sancionados.
-- Junta por CNPJ normalizado (14 díg.) contra a base federal (CEIS/CNEP) e a
-- estadual de MG. `condenada` exclui arquivamento/absolvição (lição NUTRIDORES:
-- arquivado ≠ sancionado).
create or replace view cvm_emissor_sancionado as
with emissores as (
  select cnpj_emissor, max(nome_emissor) as nome_emissor,
         count(*) as n_ofertas, sum(valor) as valor_total,
         max(data_oferta) as ultima_oferta,
         array_agg(distinct tipo_ativo) filter (where tipo_ativo is not null) as tipos_ativo
  from cvm_oferta
  where cnpj_emissor is not null and length(cnpj_emissor) = 14
  group by cnpj_emissor
)
select
  e.cnpj_emissor,
  e.nome_emissor,
  e.n_ofertas,
  e.valor_total,
  e.ultima_oferta,
  e.tipos_ativo,
  'federal'::text as origem_sancao,
  s.tipo_registro as sancao_tipo,
  s.tipo_sancao   as sancao_detalhe,
  s.orgao_nome    as sancao_orgao,
  s.ativo         as sancao_ativa,
  true            as condenada   -- CEIS/CNEP já são sanções aplicadas
from emissores e
join portal_sancionados s
  on regexp_replace(s.cpf_cnpj, '\D', '', 'g') = e.cnpj_emissor
union all
select
  e.cnpj_emissor,
  e.nome_emissor,
  e.n_ofertas,
  e.valor_total,
  e.ultima_oferta,
  e.tipos_ativo,
  'MG'::text as origem_sancao,
  m.fase     as sancao_tipo,
  m.conduta  as sancao_detalhe,
  m.orgao_lesado as sancao_orgao,
  null::boolean  as sancao_ativa,
  (m.decisao is not null and m.decisao !~* 'arquiv|absolv') as condenada
from emissores e
join mg_empresas_sancionadas m on m.cnpj_norm = e.cnpj_emissor;
