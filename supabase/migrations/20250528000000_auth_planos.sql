-- ─────────────────────────────────────────────────────────────────────────────
-- Paywall: perfis de usuário + códigos de acesso manual
-- ─────────────────────────────────────────────────────────────────────────────

-- Perfil vinculado ao auth.users
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id               UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email            TEXT        NOT NULL,
  plano            TEXT        NOT NULL DEFAULT 'free'
                               CHECK (plano IN ('free', 'individual', 'institucional')),
  plano_valido_ate TIMESTAMPTZ,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Usuário vê apenas o próprio perfil
CREATE POLICY "users_own_profile_select"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

-- Service role (server) acessa tudo
CREATE POLICY "service_role_all"
  ON public.user_profiles FOR ALL
  USING (true) WITH CHECK (true);

-- Auto-cria perfil free ao fazer cadastro
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, plano)
  VALUES (NEW.id, NEW.email, 'free')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── Códigos de acesso manual ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.codigos_acesso (
  codigo         TEXT        PRIMARY KEY,
  plano          TEXT        NOT NULL DEFAULT 'individual'
                             CHECK (plano IN ('individual', 'institucional')),
  validade_dias  INTEGER     NOT NULL DEFAULT 365,
  usado_em       TIMESTAMPTZ,
  usado_por      UUID        REFERENCES auth.users(id),
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.codigos_acesso ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode tentar usar um código (validação no server action)
CREATE POLICY "auth_users_select_codigos"
  ON public.codigos_acesso FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "service_role_all_codigos"
  ON public.codigos_acesso FOR ALL
  USING (true) WITH CHECK (true);
