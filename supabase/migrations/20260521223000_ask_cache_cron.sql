-- ═══════════════════════════════════════════════════════════════
-- Agendar limpeza diária do ask_cache via pg_cron
-- ═══════════════════════════════════════════════════════════════
-- Roda toda madrugada às 03:30 UTC (00:30 horário Brasília) limpando
-- entradas expiradas (TTL 7 dias definido em ask_cache.expires_at).

create extension if not exists pg_cron;

-- Remove agendamento anterior (idempotente)
do $$
declare
  job_id bigint;
begin
  select jobid into job_id from cron.job where jobname = 'limpar-ask-cache';
  if job_id is not null then
    perform cron.unschedule(job_id);
  end if;
end $$;

-- Agenda: todo dia 03:30 UTC
select cron.schedule(
  'limpar-ask-cache',
  '30 3 * * *',
  $$select limpar_ask_cache_expirado()$$
);

comment on extension pg_cron is 'Agendador interno do Postgres — usado p/ limpeza ask_cache.';
