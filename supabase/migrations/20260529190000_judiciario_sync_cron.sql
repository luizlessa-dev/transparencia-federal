-- ─────────────────────────────────────────────────────────────────────────
-- Cron de sync do judiciário no canônico (Fase 5 — recria o gatilho perdido)
--
-- O sync-datajud do canônico era disparado pelo cron-sync do LEGADO
-- (corklqwtrblervixxtan), deletado em 2026-05-29 → sync ia parar. Recriamos:
--   - cron-sync (edge function) dispara sync-datajud p/ os 36 tribunais + sync-tcu
--   - judiciario-sync-datajud: diário 11h UTC (8h BRT) chama cron-sync
--   - judiciario-refresh-stats: diário 11h45 UTC, refaz as MVs in-DB (sem http)
--
-- anon key é pública (ok em git). cron-sync --no-verify-jwt.
-- ─────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  anon TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlZGdnZHRha3ptc2Fid3ZqemhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxOTU5NTAsImV4cCI6MjA4Nzc3MTk1MH0.uniqshSUuIfOComBX3q0zO1pp04jkk84v6mbOBp5VCo';
BEGIN
  PERFORM cron.unschedule('judiciario-sync-datajud')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'judiciario-sync-datajud');
  PERFORM cron.unschedule('judiciario-refresh-stats')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'judiciario-refresh-stats');

  PERFORM cron.schedule(
    'judiciario-sync-datajud', '0 11 * * *',
    format($cmd$
      select net.http_post(
        url := 'https://redggdtakzmsabwvjzhb.supabase.co/functions/v1/cron-sync',
        headers := %L::jsonb,
        body := '{}'::jsonb
      );
    $cmd$, json_build_object('Content-Type','application/json','apikey',anon,'Authorization','Bearer '||anon)::text)
  );

  -- refresh das MVs direto no banco, 45min após o disparo do sync
  PERFORM cron.schedule(
    'judiciario-refresh-stats', '45 11 * * *',
    'select public.refresh_judiciario_stats();'
  );
END $$;
