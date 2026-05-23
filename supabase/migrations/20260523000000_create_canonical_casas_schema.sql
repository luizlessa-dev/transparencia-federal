-- Transparência Federal — schema canônico multi-casa
--
-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ Ativação do refactor previsto na migration 20260522090000 (ALMG):   ║
-- ║ a chegada da 2ª casa estadual (ALESP) dispara a criação de tabelas  ║
-- ║ canônicas `casas / parlamentares_estaduais / gastos_parlamentares`  ║
-- ║ com `casa_id` como FK. As tabelas `almg_*` viram views compatíveis  ║
-- ║ pra não quebrar a rota `/almg/ranking` que consome                   ║
-- ║ `almg_verba_resumo_mensal`.                                          ║
-- ╚══════════════════════════════════════════════════════════════════════╝
--
-- Estratégia desta migration (tudo dentro de transação):
--   1. Cria tabelas canônicas
--   2. Seeda casas conhecidas (ALMG, ALESP, ALERJ)
--   3. Copia dados de almg_deputados → parlamentares_estaduais
--   4. Copia dados de almg_verba_indenizatoria → gastos_parlamentares
--   5. Dropa view almg_verba_resumo_mensal, tabela almg_verba_indenizatoria,
--      tabela almg_deputados (nessa ordem por causa do FK)
--   6. Recria os 3 nomes (almg_deputados, almg_verba_indenizatoria,
--      almg_verba_resumo_mensal) como VIEWS sobre as canônicas
--
-- NOMES — por que `parlamentares_estaduais` e não `parlamentares`:
--   O nome `public.parlamentares` já está ocupado por uma tabela legacy do
--   projeto dados-civicos (Câmara/Senado federal), referenciada por
--   emendas_financeiro e ranking_parlamentar. Schema canônico estadual fica
--   em `parlamentares_estaduais` pra evitar colisão. Federal e estadual
--   têm fontes/schemas distintos — unir num futuro é refactor próprio.
--
-- IMPORTANTE pra os jobs de ingestão ALMG:
--   Depois desta migration, INSERTs/UPDATEs em `almg_deputados` e
--   `almg_verba_indenizatoria` vão falhar (views simples não são
--   writable). Os jobs em `packages/ingestao-almg/src/job-*.ts` precisam
--   ser refatorados pra escrever direto em `parlamentares_estaduais` e
--   `gastos_parlamentares` — já feito na Task #3.

-- ─── 1. casas ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.casas (
  id                  SERIAL PRIMARY KEY,
  sigla               TEXT NOT NULL UNIQUE,
  nome                TEXT NOT NULL,
  esfera              TEXT NOT NULL CHECK (esfera IN ('federal', 'estadual', 'municipal')),
  uf                  TEXT,                  -- NULL pra federal
  url_dados_abertos   TEXT,
  url_transparencia   TEXT,
  observacoes         TEXT,
  ativo               BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_casas_sigla ON public.casas (sigla);
CREATE INDEX IF NOT EXISTS idx_casas_esfera ON public.casas (esfera);

ALTER TABLE public.casas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read casas"
  ON public.casas FOR SELECT USING (true);

CREATE POLICY "Service insert casas"
  ON public.casas FOR INSERT
  WITH CHECK (
    ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'role'::text) = 'service_role'::text
  );

CREATE POLICY "Service update casas"
  ON public.casas FOR UPDATE
  USING (
    ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'role'::text) = 'service_role'::text
  );

COMMENT ON TABLE public.casas IS 'Casas legislativas cobertas pela plataforma (federal e estaduais).';

-- ─── 2. parlamentares_estaduais ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.parlamentares_estaduais (
  id                  UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  casa_id             INTEGER NOT NULL REFERENCES public.casas (id),
  id_externo          TEXT NOT NULL,         -- ID interno da casa (TEXT pra acomodar variações entre casas)
  nome                TEXT NOT NULL,
  partido             TEXT,
  tag_localizacao     TEXT,                  -- ALMG: gabinete/bloco; ALESP: ainda mapear
  foto_url            TEXT,
  ativo               BOOLEAN NOT NULL DEFAULT TRUE,
  legislatura         INTEGER,
  metadata            JSONB,                 -- campos específicos da casa
  ingested_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (casa_id, id_externo)
);

CREATE INDEX IF NOT EXISTS idx_parl_est_casa ON public.parlamentares_estaduais (casa_id);
CREATE INDEX IF NOT EXISTS idx_parl_est_nome ON public.parlamentares_estaduais (nome);
CREATE INDEX IF NOT EXISTS idx_parl_est_partido ON public.parlamentares_estaduais (partido);
CREATE INDEX IF NOT EXISTS idx_parl_est_ativo ON public.parlamentares_estaduais (ativo);
CREATE INDEX IF NOT EXISTS idx_parl_est_casa_legislatura ON public.parlamentares_estaduais (casa_id, legislatura);

ALTER TABLE public.parlamentares_estaduais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read parlamentares_estaduais"
  ON public.parlamentares_estaduais FOR SELECT USING (true);

CREATE POLICY "Service insert parlamentares_estaduais"
  ON public.parlamentares_estaduais FOR INSERT
  WITH CHECK (
    ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'role'::text) = 'service_role'::text
  );

CREATE POLICY "Service update parlamentares_estaduais"
  ON public.parlamentares_estaduais FOR UPDATE
  USING (
    ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'role'::text) = 'service_role'::text
  );

COMMENT ON TABLE public.parlamentares_estaduais IS
  'Parlamentares cobertos pela plataforma. `id_externo` é o ID da casa de origem (TEXT pra acomodar variações).';
COMMENT ON COLUMN public.parlamentares_estaduais.id_externo IS
  'ID nativo da casa (ex.: ALMG = INTEGER convertido pra TEXT; ALESP = a confirmar).';

-- ─── 3. gastos_parlamentares ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.gastos_parlamentares (
  id                  UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parlamentar_id      UUID NOT NULL REFERENCES public.parlamentares_estaduais (id),
  casa_id             INTEGER NOT NULL REFERENCES public.casas (id),  -- denormalizado pra query mais barata
  ano                 INTEGER NOT NULL,
  mes                 INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  cod_categoria       TEXT NOT NULL DEFAULT '',                       -- ALMG: INTEGER as string; ALESP: a mapear
  categoria           TEXT NOT NULL,
  categoria_total     NUMERIC(14,2),                                  -- total declarado pela casa na categoria/mês (ALMG)
  fornecedor          TEXT,                                           -- "emitente" no schema ALMG
  cnpj_cpf            TEXT NOT NULL DEFAULT '',
  num_documento       TEXT NOT NULL DEFAULT '',
  data_emissao        DATE,
  valor_bruto         NUMERIC(14,2) NOT NULL DEFAULT 0,               -- valor da nota (= valor_despesa na ALMG)
  valor_reembolso     NUMERIC(14,2),                                  -- valor efetivamente pago (NULL se casa não distingue)
  url_origem          TEXT NOT NULL,
  metadata            JSONB,                                          -- campos específicos da casa
  ingested_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotência: idêntica ao padrão ALMG, mas com parlamentar_id (UUID) em vez de deputado_id_almg (INT)
ALTER TABLE public.gastos_parlamentares
  ADD CONSTRAINT uq_gastos_parlamentares_nota
  UNIQUE (parlamentar_id, ano, mes, num_documento, cnpj_cpf, categoria, valor_bruto);

CREATE INDEX IF NOT EXISTS idx_gastos_parlamentar_periodo
  ON public.gastos_parlamentares (parlamentar_id, ano, mes);
CREATE INDEX IF NOT EXISTS idx_gastos_casa_periodo
  ON public.gastos_parlamentares (casa_id, ano, mes);
CREATE INDEX IF NOT EXISTS idx_gastos_cnpj
  ON public.gastos_parlamentares (cnpj_cpf)
  WHERE cnpj_cpf <> '';
CREATE INDEX IF NOT EXISTS idx_gastos_categoria
  ON public.gastos_parlamentares (categoria);
CREATE INDEX IF NOT EXISTS idx_gastos_data_emissao
  ON public.gastos_parlamentares (data_emissao);

ALTER TABLE public.gastos_parlamentares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read gastos_parlamentares"
  ON public.gastos_parlamentares FOR SELECT USING (true);

CREATE POLICY "Service insert gastos_parlamentares"
  ON public.gastos_parlamentares FOR INSERT
  WITH CHECK (
    ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'role'::text) = 'service_role'::text
  );

CREATE POLICY "Service update gastos_parlamentares"
  ON public.gastos_parlamentares FOR UPDATE
  USING (
    ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'role'::text) = 'service_role'::text
  );

COMMENT ON TABLE  public.gastos_parlamentares IS
  'Gastos de gabinete/verba indenizatória de parlamentares. 1 linha = 1 nota fiscal.';
COMMENT ON COLUMN public.gastos_parlamentares.valor_bruto IS
  'Valor da nota fiscal (ALMG = valor_despesa). Pode ser > valor_reembolso em reembolsos parciais.';
COMMENT ON COLUMN public.gastos_parlamentares.valor_reembolso IS
  'Valor efetivamente pago pela casa. NULL quando a casa não distingue (caso ALESP a confirmar).';

-- ─── 4. Seed das casas ─────────────────────────────────────────────────

INSERT INTO public.casas (sigla, nome, esfera, uf, url_dados_abertos, url_transparencia, observacoes)
VALUES
  ('ALMG',  'Assembleia Legislativa de Minas Gerais',  'estadual', 'MG',
   'https://dadosabertos.almg.gov.br',
   'https://www.almg.gov.br/transparencia',
   'CSV oficial inutilizável; verba indenizatória só via HTML scraping com janela rolante de ~15 meses.'),
  ('ALESP', 'Assembleia Legislativa de São Paulo',     'estadual', 'SP',
   'https://www.al.sp.gov.br/dados-abertos/',
   'https://www.al.sp.gov.br/transparencia/',
   'Portal de dados abertos formal: 26 datasets em XML, atualização diária, sem auth.'),
  ('ALERJ', 'Assembleia Legislativa do Estado do RJ',  'estadual', 'RJ',
   NULL,
   'https://transparencia.alerj.rj.gov.br/',
   'Sem dados abertos formais. DOCIGP (sistema com dado granular) é autenticado. LAI em curso.')
ON CONFLICT (sigla) DO NOTHING;

-- ─── 5. Migração dos dados ALMG → canônicas ────────────────────────────

-- 5a. Deputados ALMG → parlamentares
INSERT INTO public.parlamentares_estaduais (
  casa_id, id_externo, nome, partido, tag_localizacao, foto_url,
  ativo, legislatura, ingested_at, updated_at
)
SELECT
  (SELECT id FROM public.casas WHERE sigla = 'ALMG'),
  d.id_almg::TEXT,
  d.nome,
  d.partido,
  d.tag_localizacao,
  d.foto_url,
  d.ativo,
  d.legislatura,
  d.ingested_at,
  d.updated_at
FROM public.almg_deputados d
ON CONFLICT (casa_id, id_externo) DO NOTHING;

-- 5b. Verba ALMG → gastos_parlamentares
INSERT INTO public.gastos_parlamentares (
  parlamentar_id, casa_id, ano, mes,
  cod_categoria, categoria, categoria_total,
  fornecedor, cnpj_cpf, num_documento, data_emissao,
  valor_bruto, valor_reembolso, url_origem, ingested_at
)
SELECT
  p.id,
  (SELECT id FROM public.casas WHERE sigla = 'ALMG'),
  v.ano,
  v.mes,
  COALESCE(v.cod_categoria::TEXT, ''),
  v.categoria,
  v.categoria_total,
  v.emitente,
  v.cnpj_cpf,
  v.num_documento,
  v.data_emissao,
  v.valor_despesa,
  v.valor_reembolso,
  v.url_origem,
  v.ingested_at
FROM public.almg_verba_indenizatoria v
JOIN public.parlamentares_estaduais p
  ON p.id_externo = v.deputado_id_almg::TEXT
 AND p.casa_id = (SELECT id FROM public.casas WHERE sigla = 'ALMG')
ON CONFLICT ON CONSTRAINT uq_gastos_parlamentares_nota DO NOTHING;

-- ─── 6. Drop estruturas ALMG antigas (ordem importa por FK) ────────────

DROP VIEW IF EXISTS public.almg_verba_resumo_mensal;
DROP TABLE IF EXISTS public.almg_verba_indenizatoria;
DROP TABLE IF EXISTS public.almg_deputados;

-- ─── 7. Recria nomes ALMG como views compat ────────────────────────────

-- 7a. almg_deputados (view) — mesmas colunas que a tabela original
CREATE OR REPLACE VIEW public.almg_deputados AS
SELECT
  p.id_externo::INTEGER  AS id_almg,
  p.nome,
  p.partido,
  p.tag_localizacao,
  p.foto_url,
  p.ativo,
  p.legislatura,
  p.ingested_at,
  p.updated_at
FROM public.parlamentares_estaduais p
JOIN public.casas c ON c.id = p.casa_id
WHERE c.sigla = 'ALMG';

COMMENT ON VIEW public.almg_deputados IS
  'View compat: deputados ALMG na tabela canônica `parlamentares`. Mantida pra preservar consumers existentes da rota /almg.';

-- 7b. almg_verba_indenizatoria (view) — mesmas colunas
CREATE OR REPLACE VIEW public.almg_verba_indenizatoria AS
SELECT
  g.id,
  p.id_externo::INTEGER         AS deputado_id_almg,
  g.ano,
  g.mes,
  NULLIF(g.cod_categoria, '')::INTEGER  AS cod_categoria,
  g.categoria,
  g.categoria_total,
  g.fornecedor                  AS emitente,
  g.cnpj_cpf,
  g.num_documento,
  g.data_emissao,
  g.valor_bruto                 AS valor_despesa,
  g.valor_reembolso,
  g.url_origem,
  g.ingested_at
FROM public.gastos_parlamentares g
JOIN public.parlamentares_estaduais p ON p.id = g.parlamentar_id
JOIN public.casas c ON c.id = p.casa_id
WHERE c.sigla = 'ALMG';

COMMENT ON VIEW public.almg_verba_indenizatoria IS
  'View compat: verba indenizatória ALMG na tabela canônica `gastos_parlamentares`.';

-- 7c. almg_verba_resumo_mensal (view) — mesma semântica
-- IMPORTANTE: rota /almg/ranking consome essa view com SELECT específico.
-- Manter EXATAMENTE: id_almg, nome, partido, ano, mes, qtd_notas,
-- qtd_fornecedores, total_reembolsado, total_despesa.
CREATE OR REPLACE VIEW public.almg_verba_resumo_mensal AS
SELECT
  p.id_externo::INTEGER       AS id_almg,
  p.nome,
  p.partido,
  g.ano,
  g.mes,
  COUNT(*)                    AS qtd_notas,
  COUNT(DISTINCT g.cnpj_cpf)  AS qtd_fornecedores,
  SUM(g.valor_reembolso)      AS total_reembolsado,
  SUM(g.valor_bruto)          AS total_despesa
FROM public.gastos_parlamentares g
JOIN public.parlamentares_estaduais p ON p.id = g.parlamentar_id
JOIN public.casas c ON c.id = p.casa_id
WHERE c.sigla = 'ALMG'
GROUP BY p.id_externo, p.nome, p.partido, g.ano, g.mes;

COMMENT ON VIEW public.almg_verba_resumo_mensal IS
  'View compat: resumo mensal ALMG (consumido por /almg/ranking). Colunas idênticas à versão pré-canônica.';
