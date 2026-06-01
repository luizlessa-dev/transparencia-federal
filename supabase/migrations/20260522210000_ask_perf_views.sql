-- ═══════════════════════════════════════════════════════════════
-- Performance para a caixa de perguntas (AskBox / edge function ask)
-- ═══════════════════════════════════════════════════════════════
-- Views criadas com WITH NO DATA para evitar timeout na migration.
-- Popular com: REFRESH MATERIALIZED VIEW CONCURRENTLY <nome>;

-- ─── 1. work_mem + error message melhorada na função ──────────
create or replace function exec_readonly_query(sql_query text)
returns jsonb
language plpgsql
security invoker
as $$
declare
  result jsonb;
  safe_query text;
begin
  set local transaction_read_only = on;
  set local statement_timeout = '25s';
  set local lock_timeout = '2s';
  set local idle_in_transaction_session_timeout = '30s';
  set local work_mem = '64MB';

  safe_query := trim(sql_query);
  if right(safe_query, 1) = ';' then
    safe_query := left(safe_query, length(safe_query) - 1);
  end if;
  if safe_query !~* '\bLIMIT\b' then
    safe_query := safe_query || ' LIMIT 200';
  end if;

  execute format('select coalesce(jsonb_agg(t), ''[]''::jsonb) from (%s) t', safe_query)
  into result;

  return result;
exception
  when query_canceled then
    raise exception 'SQL execution: query demorou mais que 25s. Tente filtrar por ano, partido ou tipo de despesa específico.';
  when others then
    raise exception 'SQL execution: %', sqlerrm;
end;
$$;

revoke all on function exec_readonly_query(text) from public;
revoke all on function exec_readonly_query(text) from anon;
revoke all on function exec_readonly_query(text) from authenticated;
grant execute on function exec_readonly_query(text) to service_role;


-- ─── 2. Views materializadas (WITH NO DATA — popular depois) ──

create materialized view if not exists ask_ceap_fornecedor_agg as
select
  nome_fornecedor,
  cnpj_cpf_fornecedor,
  count(*)                            as total_transacoes,
  count(distinct deputado_id_externo) as total_deputados,
  sum(valor_liquido)                  as total_valor,
  min(ano)                            as ano_inicio,
  max(ano)                            as ano_fim
from ceaps_brutas
where nome_fornecedor is not null and valor_liquido > 0
group by nome_fornecedor, cnpj_cpf_fornecedor
with no data;

create index if not exists idx_ask_ceap_forn_valor
  on ask_ceap_fornecedor_agg (total_valor desc);


create materialized view if not exists ask_ceap_tipo_ano_agg as
select
  tipo_despesa,
  ano,
  count(*)                            as total_transacoes,
  count(distinct deputado_id_externo) as total_deputados,
  sum(valor_liquido)                  as total_valor,
  avg(valor_liquido)                  as media_valor
from ceaps_brutas
where tipo_despesa is not null and valor_liquido > 0
group by tipo_despesa, ano
with no data;

create index if not exists idx_ask_ceap_tipo_valor
  on ask_ceap_tipo_ano_agg (total_valor desc);


create materialized view if not exists ask_ceap_deputado_ano_agg as
select
  c.deputado_id_externo,
  r.nome,
  r.sigla_partido,
  r.sigla_uf,
  c.ano,
  count(*)             as total_transacoes,
  sum(c.valor_liquido) as total_valor,
  sum(case when c.tipo_despesa ilike '%passagem%' then c.valor_liquido else 0 end)   as passagens,
  sum(case when c.tipo_despesa ilike '%combusti%'  then c.valor_liquido else 0 end)   as combustivel,
  sum(case when c.tipo_despesa ilike '%divulga%'   then c.valor_liquido else 0 end)   as divulgacao,
  sum(case when c.tipo_despesa ilike '%loca%'      then c.valor_liquido else 0 end)   as locacao_veiculos
from ceaps_brutas c
left join cam_parlamentar_risco r on r.deputado_id::text = c.deputado_id_externo
where c.valor_liquido > 0
group by c.deputado_id_externo, r.nome, r.sigla_partido, r.sigla_uf, c.ano
with no data;

create index if not exists idx_ask_ceap_dep_valor
  on ask_ceap_deputado_ano_agg (total_valor desc);
create index if not exists idx_ask_ceap_dep_passagens
  on ask_ceap_deputado_ano_agg (passagens desc);


create materialized view if not exists ask_emendas_autor_ano_agg as
select
  autor_nome,
  uf,
  ano,
  tipo_emenda,
  count(*)             as total_emendas,
  sum(valor_empenhado) as total_empenhado,
  sum(valor_pago)      as total_pago,
  count(case when eh_rp9 then 1 end)                as total_rp9,
  sum(case when eh_rp9 then valor_pago else 0 end)  as valor_rp9_pago
from emendas_completas
where autor_nome is not null
group by autor_nome, uf, ano, tipo_emenda
with no data;

create index if not exists idx_ask_emendas_autor_valor
  on ask_emendas_autor_ano_agg (total_pago desc);
create index if not exists idx_ask_emendas_autor_rp9
  on ask_emendas_autor_ano_agg (valor_rp9_pago desc);


-- ─── 3. Permissões ────────────────────────────────────────────
grant select on ask_ceap_fornecedor_agg   to service_role;
grant select on ask_ceap_tipo_ano_agg     to service_role;
grant select on ask_ceap_deputado_ano_agg to service_role;
grant select on ask_emendas_autor_ano_agg to service_role;


-- ─── 4. Função de refresh e agendamento semanal ──────────────
create or replace function refresh_ask_views()
returns void language plpgsql as $$
begin
  refresh materialized view ask_ceap_fornecedor_agg;
  refresh materialized view ask_ceap_tipo_ano_agg;
  refresh materialized view ask_ceap_deputado_ano_agg;
  refresh materialized view ask_emendas_autor_ano_agg;
end;
$$;

-- Domingo 3h UTC
select cron.schedule(
  'refresh-ask-views',
  '0 3 * * 0',
  'select refresh_ask_views()'
) where not exists (
  select 1 from cron.job where jobname = 'refresh-ask-views'
);
