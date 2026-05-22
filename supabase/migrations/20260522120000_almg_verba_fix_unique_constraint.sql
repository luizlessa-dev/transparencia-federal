-- Fix: substitui o índice funcional com COALESCE por uma UNIQUE CONSTRAINT em
-- colunas simples NOT NULL. O índice funcional é incompatível com PostgREST
-- onConflict (que exige colunas simples, não expressões).
--
-- Estratégia: tornar num_documento, cnpj_cpf e valor_despesa NOT NULL com
-- defaults seguros ('', '', 0). O código de ingestão já será atualizado pra
-- passar '' e 0 em vez de NULL.

-- Tabela está vazia (ingestão ainda não rodou com sucesso), então não há
-- dados a migrar. Idempotente via IF EXISTS / IF NOT EXISTS.

-- 1. Remove o índice funcional problemático
DROP INDEX IF EXISTS public.uq_almg_verba_nota;

-- 2. Ajusta defaults das colunas (safe mesmo se já tiver dados: apenas default novo)
ALTER TABLE public.almg_verba_indenizatoria
  ALTER COLUMN num_documento  SET DEFAULT '',
  ALTER COLUMN cnpj_cpf       SET DEFAULT '',
  ALTER COLUMN valor_despesa  SET DEFAULT 0;

-- 3. Garante que NULLs existentes (se houver) viram '' / 0 antes do NOT NULL
UPDATE public.almg_verba_indenizatoria SET
  num_documento = COALESCE(num_documento, ''),
  cnpj_cpf      = COALESCE(cnpj_cpf, ''),
  valor_despesa = COALESCE(valor_despesa, 0)
WHERE num_documento IS NULL OR cnpj_cpf IS NULL OR valor_despesa IS NULL;

-- 4. Aplica NOT NULL
ALTER TABLE public.almg_verba_indenizatoria
  ALTER COLUMN num_documento  SET NOT NULL,
  ALTER COLUMN cnpj_cpf       SET NOT NULL,
  ALTER COLUMN valor_despesa  SET NOT NULL;

-- 5. Cria UNIQUE CONSTRAINT nomeado (colunas simples — compatível com PostgREST onConflict)
ALTER TABLE public.almg_verba_indenizatoria
  ADD CONSTRAINT uq_almg_verba_nota
  UNIQUE (deputado_id_almg, ano, mes, num_documento, cnpj_cpf, categoria, valor_despesa);

COMMENT ON CONSTRAINT uq_almg_verba_nota ON public.almg_verba_indenizatoria IS
  'Idempotência: (deputado, mês, doc, cnpj, categoria, valor) identifica uma nota uniquely. Strings vazias substituem NULL para compatibilidade com PostgREST onConflict.';
