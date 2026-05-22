-- ═══════════════════════════════════════════════════════════════
-- exec_readonly_query: roda SELECT arbitrário em modo read-only
-- ═══════════════════════════════════════════════════════════════
-- Usada pela Edge Function ask/ para executar SQL gerado por LLM.
-- Defesa em profundidade:
--   1. SET LOCAL transaction_read_only = on   → Postgres rejeita writes
--   2. SET LOCAL statement_timeout = 5s        → evita queries infinitas
--   3. Validação prévia no JS (whitelist tabelas, blacklist keywords)
--   4. SECURITY INVOKER (não DEFINER) → executa com permissões do caller
--
-- A função NÃO valida o SQL por dentro — a validação acontece no JS.
-- Aqui só garante que NADA que escreva no DB consiga rodar.

create or replace function exec_readonly_query(sql_query text)
returns jsonb
language plpgsql
security invoker
as $$
declare
  result jsonb;
begin
  -- Defesas in-DB
  set local transaction_read_only = on;
  set local statement_timeout = '5s';
  set local lock_timeout = '1s';
  set local idle_in_transaction_session_timeout = '5s';

  -- Executa e converte resultado em jsonb array
  execute format('select coalesce(jsonb_agg(t), ''[]''::jsonb) from (%s) t', sql_query)
  into result;

  return result;
exception
  when others then
    raise exception 'Query error: %', sqlerrm;
end;
$$;

comment on function exec_readonly_query(text) is
  'Executa SELECT arbitrário em transaction_read_only. Usado pela edge function ask/. NÃO conceder a anon ou authenticated.';

-- Permissões: só service_role pode chamar
revoke all on function exec_readonly_query(text) from public;
revoke all on function exec_readonly_query(text) from anon;
revoke all on function exec_readonly_query(text) from authenticated;
grant execute on function exec_readonly_query(text) to service_role;
