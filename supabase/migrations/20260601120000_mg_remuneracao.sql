-- ─────────────────────────────────────────────────────────────────────────
-- mg_remuneracao — remuneração de servidores do EXECUTIVO de Minas Gerais
--
-- Primeiro dataset do módulo MG (fiscalização do Executivo estadual). Foco do
-- MVP: SUPERSALÁRIOS — remuneração acima do teto constitucional.
--
-- Fonte: CKAN dados.mg.gov.br (CGE), dataset de remuneração de agentes públicos
--        (resource exato resolvido pelo `run-discover`). Licença CC-BY-4.0 →
--        redistribuição permitida com atribuição.
--
-- Padrão snapshot (como folha_gabinete): historiamos por mês de competência;
-- a chave natural evita duplicar reexecuções. Sem FK — é um domínio novo
-- (servidores do Executivo), não se liga a `parlamentares`.
--
-- LGPD: são pessoas físicas (servidores públicos). Dado de remuneração é
-- público por força da LAI, mas a publicação editorial exige direito de
-- resposta e política de correção — ver política do projeto.
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS mg_remuneracao (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_mes          date NOT NULL,                 -- 1º dia do mês do snapshot de coleta
  ano                   int,                           -- ano de competência da remuneração
  mes                   int,                           -- mês de competência (1-12)
  poder                 text NOT NULL DEFAULT 'executivo',
  orgao                 text,                          -- secretaria/órgão/autarquia
  servidor_nome         text NOT NULL,
  servidor_id_externo   text,                          -- matrícula/id da fonte, se houver (soft)
  cargo                 text,
  funcao                text,
  situacao              text,                          -- vínculo: efetivo, comissionado, etc.
  carga_horaria         text,

  remuneracao_bruta     numeric(14, 2),                -- total bruto antes de descontos
  descontos             numeric(14, 2),
  remuneracao_liquida   numeric(14, 2),

  -- Base usada pra o flag de supersalário (em geral o bruto). O job preenche
  -- conforme a coluna escolhida da fonte; default = bruta.
  remuneracao_base      numeric(14, 2),
  -- Teto da competência. DEFAULT = teto constitucional federal 2025/2026
  -- (subsídio Min. STF). CONFIRMAR/ATUALIZAR por ano de referência no job.
  teto_referencia       numeric(14, 2) NOT NULL DEFAULT 46366.19,

  acima_teto            boolean GENERATED ALWAYS AS (remuneracao_base > teto_referencia) STORED,
  valor_excedente       numeric(14, 2)
                          GENERATED ALWAYS AS (GREATEST(remuneracao_base - teto_referencia, 0)) STORED,

  dados                 jsonb,                         -- linha original da fonte (auditoria)
  url_origem            text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  -- Chave natural (sem ID estável de pessoa na maioria dos CSVs gov): identifica
  -- a linha dentro do snapshot. Reexecutar o mesmo mês é idempotente.
  UNIQUE (snapshot_mes, orgao, servidor_nome, cargo, remuneracao_base)
);

CREATE INDEX IF NOT EXISTS idx_mg_remuneracao_snapshot   ON mg_remuneracao (snapshot_mes);
CREATE INDEX IF NOT EXISTS idx_mg_remuneracao_orgao      ON mg_remuneracao (orgao);
CREATE INDEX IF NOT EXISTS idx_mg_remuneracao_servidor   ON mg_remuneracao (servidor_nome);
CREATE INDEX IF NOT EXISTS idx_mg_remuneracao_acima_teto ON mg_remuneracao (snapshot_mes) WHERE acima_teto;

COMMENT ON TABLE mg_remuneracao IS
  'Remuneração de servidores do Executivo de MG (CKAN/CGE, CC-BY-4.0). Snapshot mensal; foco em supersalários.';
COMMENT ON COLUMN mg_remuneracao.remuneracao_base IS
  'Valor comparado ao teto p/ flag de supersalário (em geral remuneracao_bruta).';
COMMENT ON COLUMN mg_remuneracao.teto_referencia IS
  'Teto constitucional da competência. DEFAULT 46366.19 (STF 2025/26) — CONFIRMAR por ano no job de ingestão.';

-- View: snapshot de coleta mais recente.
CREATE OR REPLACE VIEW mg_remuneracao_atual AS
SELECT r.*
FROM mg_remuneracao r
JOIN (SELECT max(snapshot_mes) AS snapshot_mes FROM mg_remuneracao) u
  ON u.snapshot_mes = r.snapshot_mes;

COMMENT ON VIEW mg_remuneracao_atual IS 'Último snapshot de mg_remuneracao.';

-- View: supersalários do snapshot mais recente, do maior excedente pro menor.
CREATE OR REPLACE VIEW mg_supersalarios AS
SELECT orgao, servidor_nome, cargo, situacao,
       remuneracao_base, teto_referencia, valor_excedente,
       ano, mes, snapshot_mes, url_origem
FROM mg_remuneracao_atual
WHERE acima_teto
ORDER BY valor_excedente DESC NULLS LAST;

COMMENT ON VIEW mg_supersalarios IS
  'Servidores do Executivo de MG com remuneração acima do teto, último snapshot.';
