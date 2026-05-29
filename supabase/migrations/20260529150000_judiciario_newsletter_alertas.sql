-- ─────────────────────────────────────────────────────────────────────────
-- Migra a feature newsletter/alertas do legado pro canônico (Fase 5)
--
-- O front observatorio-judiciario (NewsletterForm/AlertaForm) faz POST pras
-- edge functions newsletter-subscribe / alerta-subscribe. Pós-cutover essas
-- functions e suas tabelas não existiam no canônico → formulários quebrados (404).
-- Esta migration recria as 3 tabelas (schema espelhado do legado
-- corklqwtrblervixxtan, com defaults que as functions assumem).
--
-- RLS habilitado SEM policy pública: contêm PII (emails). Só service_role
-- (as edge functions) acessa; anon/authenticated são negados por padrão.
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                TEXT NOT NULL UNIQUE,
  tribunais_preferidos TEXT[] DEFAULT '{}',
  ativo                BOOLEAN NOT NULL DEFAULT TRUE,
  confirmado           BOOLEAN NOT NULL DEFAULT FALSE,
  token_confirmacao    TEXT DEFAULT gen_random_uuid()::text,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at         TIMESTAMPTZ,
  unsubscribed_at      TIMESTAMPTZ,
  ip_signup            INET,
  user_agent           TEXT,
  token_unsubscribe    TEXT DEFAULT gen_random_uuid()::text
);

CREATE TABLE IF NOT EXISTS public.newsletter_sends (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id     UUID REFERENCES public.newsletter_subscribers(id) ON DELETE CASCADE,
  semana_referencia DATE,
  sent_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  status            TEXT,
  error_message     TEXT
);

CREATE TABLE IF NOT EXISTS public.alertas_processo (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email              TEXT NOT NULL,
  tipo               TEXT NOT NULL,
  numero_processo    TEXT,
  tribunal           TEXT,
  termo_busca        TEXT,
  ativo              BOOLEAN NOT NULL DEFAULT TRUE,
  confirmado         BOOLEAN NOT NULL DEFAULT FALSE,
  token_confirmacao  TEXT DEFAULT gen_random_uuid()::text,
  token_cancelamento TEXT DEFAULT gen_random_uuid()::text,
  ultimo_check       TIMESTAMPTZ,
  ultimo_resultado   JSONB,
  criado_em          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alertas_email ON public.alertas_processo (email);
CREATE INDEX IF NOT EXISTS idx_news_sub_email ON public.newsletter_subscribers (email);

-- PII: RLS on, sem policy → só service_role (edge functions) acessa.
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_sends       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas_processo       ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload config';
