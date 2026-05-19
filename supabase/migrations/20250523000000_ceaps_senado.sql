-- F3: CEAPS Senado
-- Cota para o Exercício da Atividade Parlamentar dos Senadores
-- Fonte: senado.leg.br/transparencia/LAI/verba/despesa_ceaps_{ANO}.csv

CREATE TABLE IF NOT EXISTS ceaps_senado_brutas (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Chave natural do Senado
  cod_documento       text NOT NULL,         -- COD_DOCUMENTO (único por registro)
  ano                 smallint NOT NULL,

  -- Senador (apenas nome, sem CPF na fonte)
  senador             text NOT NULL,
  senador_normalizado text,                  -- uppercase trim para joins

  -- Despesa
  mes                 smallint,
  tipo_despesa        text,
  cnpj_cpf            text,                 -- do FORNECEDOR
  fornecedor          text,
  documento           text,                 -- número do doc fiscal
  data                date,
  detalhamento        text,
  valor_reembolsado   numeric(18, 2) NOT NULL DEFAULT 0,

  -- Raw
  dados               jsonb,
  atualizado_em       timestamptz NOT NULL DEFAULT now(),

  UNIQUE (cod_documento, ano)
);

CREATE INDEX IF NOT EXISTS idx_ceaps_senado_ano      ON ceaps_senado_brutas (ano);
CREATE INDEX IF NOT EXISTS idx_ceaps_senado_senador  ON ceaps_senado_brutas (senador_normalizado, ano);
CREATE INDEX IF NOT EXISTS idx_ceaps_senado_tipo     ON ceaps_senado_brutas (tipo_despesa, ano);
CREATE INDEX IF NOT EXISTS idx_ceaps_senado_forn     ON ceaps_senado_brutas (cnpj_cpf);

-- Tabela analítica: um registro por senador por ano
CREATE TABLE IF NOT EXISTS ceaps_senado_ranking (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  senador             text NOT NULL,
  senador_normalizado text NOT NULL,
  ano                 smallint NOT NULL,

  -- Totais
  total_reembolsado   numeric(18, 2) NOT NULL DEFAULT 0,
  total_documentos    integer NOT NULL DEFAULT 0,

  -- Breakdown por tipo de despesa
  por_tipo            jsonb,

  -- Top fornecedores
  top_fornecedores    jsonb,

  -- Ranking
  posicao             integer,

  atualizado_em       timestamptz NOT NULL DEFAULT now(),

  UNIQUE (senador_normalizado, ano)
);

CREATE INDEX IF NOT EXISTS idx_ceaps_senado_rank_ano   ON ceaps_senado_ranking (ano);
CREATE INDEX IF NOT EXISTS idx_ceaps_senado_rank_total ON ceaps_senado_ranking (total_reembolsado DESC, ano);
CREATE INDEX IF NOT EXISTS idx_ceaps_senado_rank_pos   ON ceaps_senado_ranking (posicao, ano);
