-- Transparência Federal — nó ALMG (Assembleia Legislativa de Minas Gerais)
--
-- Primeiro nó estadual da plataforma. Schema isolado por prefixo `almg_*`
-- até existir 2ª casa estadual; nessa altura vira refactor pra tabelas
-- canônicas `casas/parlamentares/gastos` com casa_id como FK.
--
-- Fonte de dados:
--   - Deputados: API XML `dadosabertos.almg.gov.br/api/v2/deputados/em_exercicio`
--   - Verba indenizatória: HTML scraping de
--     `www.almg.gov.br/transparencia/.../verba-indenizatoria/detalhe.html`
--     com POST body `periodo=MMYYYY`. CSV oficial é esqueleto vazio.
--
-- Granularidade: 1 linha = 1 nota fiscal individual (Operação Serenata).

-- ─── Deputados ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.almg_deputados (
  id_almg          INTEGER PRIMARY KEY,
  nome             TEXT NOT NULL,
  partido          TEXT,
  tag_localizacao  TEXT,
  foto_url         TEXT,
  ativo            BOOLEAN NOT NULL DEFAULT TRUE,
  legislatura      INTEGER,
  ingested_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_almg_deputados_nome ON public.almg_deputados (nome);
CREATE INDEX IF NOT EXISTS idx_almg_deputados_partido ON public.almg_deputados (partido);
CREATE INDEX IF NOT EXISTS idx_almg_deputados_ativo ON public.almg_deputados (ativo);

ALTER TABLE public.almg_deputados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read almg_deputados"
  ON public.almg_deputados FOR SELECT USING (true);

CREATE POLICY "Service insert almg_deputados"
  ON public.almg_deputados FOR INSERT
  WITH CHECK (
    ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'role'::text) = 'service_role'::text
  );

CREATE POLICY "Service update almg_deputados"
  ON public.almg_deputados FOR UPDATE
  USING (
    ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'role'::text) = 'service_role'::text
  );

COMMENT ON TABLE  public.almg_deputados IS 'Deputados estaduais MG em exercício na 20ª legislatura. Fonte: API XML ALMG.';
COMMENT ON COLUMN public.almg_deputados.id_almg IS 'ID interno da ALMG (estável entre legislaturas).';

-- ─── Verba indenizatória ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.almg_verba_indenizatoria (
  id                  UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deputado_id_almg    INTEGER NOT NULL REFERENCES public.almg_deputados (id_almg),
  ano                 INTEGER NOT NULL,
  mes                 INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  cod_categoria       INTEGER,
  categoria           TEXT NOT NULL,
  categoria_total     NUMERIC(14,2),  -- valor declarado no badge da categoria (soma reembolso)
  emitente            TEXT,
  cnpj_cpf            TEXT,
  num_documento       TEXT,
  data_emissao        DATE,
  valor_despesa       NUMERIC(14,2),
  valor_reembolso     NUMERIC(14,2),
  url_origem          TEXT NOT NULL,
  ingested_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotência: a mesma nota não pode entrar duas vezes
CREATE UNIQUE INDEX IF NOT EXISTS uq_almg_verba_nota
  ON public.almg_verba_indenizatoria (
    deputado_id_almg, ano, mes, COALESCE(num_documento, ''),
    COALESCE(cnpj_cpf, ''), categoria, COALESCE(valor_despesa, 0)
  );

CREATE INDEX IF NOT EXISTS idx_almg_verba_dep_periodo
  ON public.almg_verba_indenizatoria (deputado_id_almg, ano, mes);

CREATE INDEX IF NOT EXISTS idx_almg_verba_cnpj
  ON public.almg_verba_indenizatoria (cnpj_cpf)
  WHERE cnpj_cpf IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_almg_verba_categoria
  ON public.almg_verba_indenizatoria (categoria);

CREATE INDEX IF NOT EXISTS idx_almg_verba_data_emissao
  ON public.almg_verba_indenizatoria (data_emissao);

ALTER TABLE public.almg_verba_indenizatoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read almg_verba"
  ON public.almg_verba_indenizatoria FOR SELECT USING (true);

CREATE POLICY "Service insert almg_verba"
  ON public.almg_verba_indenizatoria FOR INSERT
  WITH CHECK (
    ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'role'::text) = 'service_role'::text
  );

CREATE POLICY "Service update almg_verba"
  ON public.almg_verba_indenizatoria FOR UPDATE
  USING (
    ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'role'::text) = 'service_role'::text
  );

COMMENT ON TABLE public.almg_verba_indenizatoria IS
  'Notas fiscais de verba indenizatória dos deputados estaduais MG. 1 linha = 1 nota.';
COMMENT ON COLUMN public.almg_verba_indenizatoria.valor_despesa IS
  'Valor da nota fiscal (pode ser > valor_reembolso em reembolsos parciais).';
COMMENT ON COLUMN public.almg_verba_indenizatoria.valor_reembolso IS
  'Valor efetivamente reembolsado pela ALMG — é o "gasto público" real.';
COMMENT ON COLUMN public.almg_verba_indenizatoria.categoria_total IS
  'Total declarado pela ALMG no header da categoria (soma de reembolso na categoria/mês).';

-- ─── View consolidada (atalho pra ranking/listing) ──────────────────────

CREATE OR REPLACE VIEW public.almg_verba_resumo_mensal AS
SELECT
  d.id_almg,
  d.nome,
  d.partido,
  v.ano,
  v.mes,
  COUNT(*) AS qtd_notas,
  COUNT(DISTINCT v.cnpj_cpf) AS qtd_fornecedores,
  SUM(v.valor_reembolso) AS total_reembolsado,
  SUM(v.valor_despesa) AS total_despesa
FROM public.almg_verba_indenizatoria v
JOIN public.almg_deputados d ON d.id_almg = v.deputado_id_almg
GROUP BY d.id_almg, d.nome, d.partido, v.ano, v.mes;

COMMENT ON VIEW public.almg_verba_resumo_mensal IS
  'Resumo mensal por deputado: notas, fornecedores distintos, total. Atalho pra ranking.';
