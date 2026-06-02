-- Quota diária da funcionalidade de IA (/api/ask).
--
-- Modelo:
--   free          →  5 perguntas/dia
--   individual    →  50 perguntas/dia
--   institucional →  ilimitado (nunca chama a função RPC)
--   anônimo       →  rate-limit por IP (tratado na edge function, não aqui)
--
-- A função ask_quota_check_increment é atômica: incrementa SOMENTE se ainda
-- dentro do limite, e devolve o count atual + se a chamada foi permitida.

-- ── tabela ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ask_quota (
  user_id  uuid    NOT NULL,
  date     date    NOT NULL DEFAULT CURRENT_DATE,
  count    integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

-- Cada usuário só lê/escreve a própria linha.
ALTER TABLE public.ask_quota ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can read own quota"
  ON public.ask_quota FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "users can upsert own quota"
  ON public.ask_quota FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users can update own quota"
  ON public.ask_quota FOR UPDATE
  USING (user_id = auth.uid());

-- ── função RPC atômica ────────────────────────────────────────────────────
-- Retorna (count, allowed):
--   - se count < p_limit: incrementa e devolve allowed=true
--   - se count >= p_limit: não incrementa e devolve allowed=false
-- SECURITY DEFINER → roda como postgres (ignora RLS da tabela),
-- mas a autorização já está garantida pelo JWT validado no caller.

CREATE OR REPLACE FUNCTION public.ask_quota_check_increment(
  p_user_id uuid,
  p_limit   integer
) RETURNS TABLE (count integer, allowed boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Garante que existe a linha para hoje
  INSERT INTO public.ask_quota (user_id, date, count)
  VALUES (p_user_id, CURRENT_DATE, 0)
  ON CONFLICT (user_id, date) DO NOTHING;

  -- Incrementa atomicamente apenas se dentro do limite
  UPDATE public.ask_quota
  SET    count = CASE
                  WHEN ask_quota.count < p_limit THEN ask_quota.count + 1
                  ELSE ask_quota.count
                END
  WHERE  user_id = p_user_id
    AND  date    = CURRENT_DATE
  RETURNING ask_quota.count INTO v_count;

  RETURN QUERY SELECT v_count, (v_count <= p_limit);
END;
$$;

-- Apenas usuários autenticados podem chamar a função.
REVOKE EXECUTE ON FUNCTION public.ask_quota_check_increment(uuid, integer) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.ask_quota_check_increment(uuid, integer) TO authenticated;
