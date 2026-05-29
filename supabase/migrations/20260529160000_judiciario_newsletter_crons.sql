-- ─────────────────────────────────────────────────────────────────────────
-- Crons da newsletter/alertas do judiciário no canônico (Fase 5)
--
-- Reproduz o agendamento que o legado corklqwtrblervixxtan tinha:
--   - newsletter-send: digest semanal, sexta 10h BRT (13h UTC)
--   - alerta-check: varre alertas e notifica novas decisões, diário 8h BRT (11h UTC)
--
-- As functions estão deployadas --no-verify-jwt e testadas sem header (200),
-- então o cron só faz POST. Inclui apikey anon (chave PÚBLICA, ok em git) por
-- robustez de roteamento do gateway. NENHUM secret service_role no SQL.
--
-- newsletter-send deduplica por semana_referencia (idempotente); alerta-check
-- é no-op sem alertas. Disparo extra é inofensivo.
-- ─────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- anon key canônica (pública — mesma do bundle do front)
DO $$
DECLARE
  anon TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlZGdnZHRha3ptc2Fid3ZqemhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxOTU5NTAsImV4cCI6MjA4Nzc3MTk1MH0.uniqshSUuIfOComBX3q0zO1pp04jkk84v6mbOBp5VCo';
  base TEXT := 'https://redggdtakzmsabwvjzhb.supabase.co/functions/v1';
BEGIN
  -- idempotência: remove jobs antigos com mesmo nome se existirem
  PERFORM cron.unschedule('judiciario-newsletter-send')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'judiciario-newsletter-send');
  PERFORM cron.unschedule('judiciario-alerta-check')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'judiciario-alerta-check');

  -- newsletter-send: sexta 13h UTC (10h BRT)
  PERFORM cron.schedule(
    'judiciario-newsletter-send', '0 13 * * 5',
    format($cmd$
      select net.http_post(
        url := %L,
        headers := %L::jsonb,
        body := '{}'::jsonb
      );
    $cmd$, base || '/newsletter-send',
           json_build_object('Content-Type','application/json','apikey',anon,'Authorization','Bearer '||anon)::text)
  );

  -- alerta-check: diário 11h UTC (8h BRT)
  PERFORM cron.schedule(
    'judiciario-alerta-check', '0 11 * * *',
    format($cmd$
      select net.http_post(
        url := %L,
        headers := %L::jsonb,
        body := '{}'::jsonb
      );
    $cmd$, base || '/alerta-check',
           json_build_object('Content-Type','application/json','apikey',anon,'Authorization','Bearer '||anon)::text)
  );
END $$;
