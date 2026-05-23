-- ═══════════════════════════════════════════════════════════════
-- Fix: regex \b não é word boundary em PostgreSQL
-- ═══════════════════════════════════════════════════════════════
-- Bug: as versões anteriores de exec_readonly_query usavam
--   `if safe_query !~* '\bLIMIT\b'` para checar se a query já
-- tinha LIMIT. Mas em PostgreSQL POSIX ARE, `\b` significa
-- BACKSPACE (caractere 0x08), não word boundary — então o
-- match nunca acontecia e a função sempre acrescentava
-- ` LIMIT 200`, produzindo `... LIMIT 10 LIMIT 200` e erro
-- "syntax error at or near LIMIT" para qualquer pergunta
-- do AskBox que passasse pelos templates de intents.ts.
--
-- Word boundary em PG é `\y` (single boundary) ou `\m`/`\M`
-- (begin/end of word). Esta migração corrige usando `\m...\M`.

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

  -- Word boundary em PG ARE: \m (begin) e \M (end). NÃO usar \b
  -- (em PG é backspace, não boundary).
  if upper(safe_query) !~ '\mLIMIT\M' then
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
