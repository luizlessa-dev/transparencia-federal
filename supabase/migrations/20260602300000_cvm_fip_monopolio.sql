-- ───────────────────────────────────────────────────────────────────────────
-- FIPs monopolizados — "universo Galo Forte".
-- Critério: nr_cotst = 1 AND pr_pf = 100 AND vl_cap_integr > 10.000.000.
-- Retorna o último informe disponível por fundo (janela de competência máx).
-- ───────────────────────────────────────────────────────────────────────────

create or replace view cvm_fip_monopolio as
with latest as (
  select
    cnpj_norm,
    max(dt_comptc) as dt_max
  from cvm_fip_informe
  where nr_cotst = 1
    and pr_pf = 100
    and vl_cap_integr > 10000000
  group by cnpj_norm
),
informe_atual as (
  select distinct on (i.cnpj_norm)
    i.cnpj_norm,
    i.denom,
    i.tipo,
    i.dt_comptc,
    i.vl_patrim_liq,
    i.vl_cap_integr,
    i.vl_cap_compr,
    i.nr_cotst,
    i.pr_pf,
    i.qt_cota
  from cvm_fip_informe i
  join latest l on l.cnpj_norm = i.cnpj_norm and l.dt_max = i.dt_comptc
  order by i.cnpj_norm, i.vl_patrim_liq desc nulls last
)
select
  ia.*,
  f.situacao,
  f.classe,
  f.classe_anbima,
  f.admin,
  f.gestor,
  f.controlador,
  f.cnpj_admin,
  f.cnpj_gestor,
  -- tem aresta no grafo? (fundo de cotas que detém/é detido por outros)
  exists(
    select 1 from cvm_carteira_edge e
    where e.cnpj_fundo = ia.cnpj_norm or e.cnpj_ativo = ia.cnpj_norm
  ) as tem_aresta_grafo,
  -- emitiu oferta pública?
  exists(
    select 1 from cvm_oferta o
    where regexp_replace(coalesce(o.cnpj_emissor, ''), '\D', '', 'g') = ia.cnpj_norm
  ) as tem_oferta,
  -- é alvo político? (sócio PF com mesmo nome que parlamentar)
  exists(
    select 1 from cnpj_socios s
    where regexp_replace(s.cnpj_basico || '0001', '\D', '', 'g') = ia.cnpj_norm
      and exists(
        select 1 from cam_parlamentar_risco p
        where trim(regexp_replace(regexp_replace(upper(unaccent(p.nome)), '[^A-Z0-9 ]', ' ', 'g'), '\s+', ' ', 'g'))
            = s.nome_norm
      )
  ) as tem_politico
from informe_atual ia
left join cvm_fundo f on f.cnpj_norm = ia.cnpj_norm;

comment on view cvm_fip_monopolio is
  'FIPs com 1 cotista PF (100%) e capital integralizado > R$10M — padrão Galo Forte. Um registro por fundo, competência mais recente.';

-- ───────────────────────────────────────────────────────────────────────────
-- Série histórica de um FIP monopolizado — para a página de detalhe.
-- Retorna todos os informes de um CNPJ, ordenados por competência.
-- ───────────────────────────────────────────────────────────────────────────
create or replace function cvm_fip_monopolio_historico(p_cnpj text)
returns table (
  dt_comptc      date,
  vl_patrim_liq  numeric,
  vl_cap_integr  numeric,
  vl_cap_compr   numeric,
  nr_cotst       integer,
  pr_pf          numeric,
  qt_cota        numeric
)
language sql stable as $$
  select
    dt_comptc,
    max(vl_patrim_liq)  as vl_patrim_liq,
    max(vl_cap_integr)  as vl_cap_integr,
    max(vl_cap_compr)   as vl_cap_compr,
    min(nr_cotst)       as nr_cotst,
    max(pr_pf)          as pr_pf,
    max(qt_cota)        as qt_cota
  from cvm_fip_informe
  where cnpj_norm = regexp_replace(coalesce(p_cnpj, ''), '\D', '', 'g')
  group by dt_comptc
  order by dt_comptc;
$$;
