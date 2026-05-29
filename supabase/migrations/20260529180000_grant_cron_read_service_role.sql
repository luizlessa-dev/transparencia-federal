-- Permite service_role LER os jobs do pg_cron (debug/observabilidade).
-- service_role já é admin-equivalente; leitura de cron.job é segura.
GRANT USAGE ON SCHEMA cron TO service_role;
GRANT SELECT ON cron.job, cron.job_run_details TO service_role;
