-- ═══════════════════════════════════════════════════════════════
-- Aumenta statement_timeout de 5s → 25s na exec_readonly_query
-- e adiciona LIMIT 200 automático como proteção contra full scans.
-- ═══════════════════════════════════════════════════════════════
-- Motivo: queries em ceaps_brutas (~500k linhas), emendas_completas
-- (~75k) e joins entre elas frequentemente excedem 5s legítimo.
-- 25s cobre GROUP BY + ORDER BY em tabelas grandes com índices.

create or replace function exec_readonly_query(sql_query text)
returns jsonb
language plpgsql
security invoker
as $$
declare
  result jsonb;
  safe_query text;
begin
  -- Defesas in-DB
  set local transaction_read_only = on;
  set local statement_timeout = '25s';
  set local lock_timeout = '2s';
  set local idle_in_transaction_session_timeout = '30s';

  -- Garante LIMIT para evitar retorno de tabela inteira
  safe_query := trim(sql_query);
  -- Remove ponto-e-vírgula final se existir
  if right(safe_query, 1) = ';' then
    safe_query := left(safe_query, length(safe_query) - 1);
  end if;
  -- Adiciona LIMIT 200 se não houver LIMIT explícito
  if safe_query !~* '\bLIMIT\b' then
    safe_query := safe_query || ' LIMIT 200';
  end if;

  -- Executa e converte resultado em jsonb array
  execute format('select coalesce(jsonb_agg(t), ''[]''::jsonb) from (%s) t', safe_query)
  into result;

  return result;
exception
  when query_canceled then
    raise exception 'SQL execution: canceling statement due to statement timeout. Tente uma pergunta mais específica (ex.: filtrar por ano ou partido).';
  when others then
    raise exception 'SQL execution: %', sqlerrm;
end;
$$;

comment on function exec_readonly_query(text) is
  'Executa SELECT arbitrário em transaction_read_only com timeout 25s e LIMIT 200 automático. Usado pela edge function ask/.';

-- Permissões: só service_role pode chamar (sem alteração)
revoke all on function exec_readonly_query(text) from public;
revoke all on function exec_readonly_query(text) from anon;
revoke all on function exec_readonly_query(text) from authenticated;
grant execute on function exec_readonly_query(text) to service_role;
