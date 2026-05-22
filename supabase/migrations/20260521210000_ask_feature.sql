-- ═══════════════════════════════════════════════════════════════
-- Caixa de pesquisa livre — backend tables
-- ═══════════════════════════════════════════════════════════════

-- Cache de perguntas respondidas (TTL 7 dias)
create table if not exists ask_cache (
  id uuid primary key default gen_random_uuid(),
  pergunta_hash text unique not null,
  pergunta_original text not null,
  sql_executado text not null,
  resultado jsonb not null,
  resposta_narrativa text not null,
  tabelas_usadas text[],
  input_tokens int default 0,
  output_tokens int default 0,
  custo_estimado_usd numeric(10, 6) default 0,
  hit_count int default 1,
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '7 days')
);

create index if not exists idx_ask_cache_hash on ask_cache(pergunta_hash);
create index if not exists idx_ask_cache_expires on ask_cache(expires_at);

comment on table ask_cache is
  'Cache de perguntas em linguagem natural processadas pela edge function ask. TTL 7 dias.';

-- Log de TODAS as buscas (telemetria + analytics)
create table if not exists ask_log (
  id uuid primary key default gen_random_uuid(),
  pergunta_original text not null,
  pergunta_hash text not null,
  ip_hash text,
  user_agent text,
  cache_hit boolean default false,
  success boolean default true,
  erro text,
  latencia_ms int,
  tokens_total int,
  custo_usd numeric(10, 6),
  created_at timestamptz default now()
);

create index if not exists idx_ask_log_created on ask_log(created_at desc);
create index if not exists idx_ask_log_success on ask_log(success, created_at desc);
create index if not exists idx_ask_log_pergunta on ask_log using gin (to_tsvector('portuguese', pergunta_original));

comment on table ask_log is
  'Log de todas as buscas. Usar pra: ver perguntas populares, detectar abuso, calcular custo real.';

-- View pra perguntas mais frequentes (vira input pros botões de sugestão)
create or replace view ask_perguntas_populares as
select
  pergunta_original,
  pergunta_hash,
  count(*) as total_buscas,
  count(*) filter (where cache_hit) as cache_hits,
  count(*) filter (where success = false) as falhas,
  max(created_at) as ultima_busca
from ask_log
where created_at > now() - interval '30 days'
group by pergunta_original, pergunta_hash
having count(*) >= 3
order by total_buscas desc;

comment on view ask_perguntas_populares is
  'Perguntas com 3+ buscas nos últimos 30 dias — input pros botões de sugestão da home.';

-- Função pra limpar cache expirado (rodar via cron diário)
create or replace function limpar_ask_cache_expirado()
returns int
language plpgsql
security definer
as $$
declare
  deletadas int;
begin
  delete from ask_cache where expires_at < now();
  get diagnostics deletadas = row_count;
  return deletadas;
end;
$$;

comment on function limpar_ask_cache_expirado is
  'Limpa entradas expiradas do ask_cache. Agendar via pg_cron diário.';
