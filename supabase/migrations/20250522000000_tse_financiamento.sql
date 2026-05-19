-- G1: Financiamento Eleitoral TSE
-- Receitas de candidatos a Deputado Federal (CD_CARGO=6) e Senador (CD_CARGO=5)
-- Fonte: cdn.tse.jus.br/estatistica/sead/odsele/prestacao_contas/

CREATE TABLE IF NOT EXISTS tse_receitas_brutas (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificação única da receita (TSE)
  sq_receita            bigint NOT NULL,
  ano_eleicao           smallint NOT NULL,

  -- Candidato
  sq_candidato          text NOT NULL,
  nm_candidato          text NOT NULL,
  nr_cpf_candidato      text,
  cd_cargo              smallint NOT NULL,  -- 5=Senador, 6=Deputado Federal
  ds_cargo              text NOT NULL,
  sg_uf                 text NOT NULL,      -- UF de abrangência do candidato
  nr_partido            smallint,
  sg_partido            text,
  nm_partido            text,

  -- Classificação da receita
  cd_fonte_receita      smallint,
  ds_fonte_receita      text,               -- "FUNDO ESPECIAL", "OUTROS RECURSOS", "FUNDO PARTIDARIO"
  cd_origem_receita     int,
  ds_origem_receita     text,
  cd_especie_receita    smallint,
  ds_especie_receita    text,

  -- Doador
  nr_cpf_cnpj_doador    text,
  nm_doador             text,
  nm_doador_rfb         text,
  cd_cnae_doador        text,
  ds_cnae_doador        text,
  sg_uf_doador          text,

  -- Valores
  vr_receita            numeric(18, 2) NOT NULL DEFAULT 0,
  dt_receita            date,
  ds_receita            text,

  -- Raw
  dados                 jsonb,
  atualizado_em         timestamptz NOT NULL DEFAULT now(),

  UNIQUE (sq_receita, ano_eleicao)
);

CREATE INDEX IF NOT EXISTS idx_tse_receitas_ano     ON tse_receitas_brutas (ano_eleicao);
CREATE INDEX IF NOT EXISTS idx_tse_receitas_cargo   ON tse_receitas_brutas (cd_cargo, ano_eleicao);
CREATE INDEX IF NOT EXISTS idx_tse_receitas_cand    ON tse_receitas_brutas (sq_candidato, ano_eleicao);
CREATE INDEX IF NOT EXISTS idx_tse_receitas_uf      ON tse_receitas_brutas (sg_uf, ano_eleicao);
CREATE INDEX IF NOT EXISTS idx_tse_receitas_partido ON tse_receitas_brutas (sg_partido, ano_eleicao);
CREATE INDEX IF NOT EXISTS idx_tse_receitas_fonte   ON tse_receitas_brutas (cd_fonte_receita, ano_eleicao);
CREATE INDEX IF NOT EXISTS idx_tse_receitas_doador  ON tse_receitas_brutas (nr_cpf_cnpj_doador);

-- Tabela analítica: um registro por candidato por eleição
CREATE TABLE IF NOT EXISTS tse_candidatos_receitas_agg (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificação do candidato
  sq_candidato          text NOT NULL,
  ano_eleicao           smallint NOT NULL,
  nm_candidato          text NOT NULL,
  nr_cpf_candidato      text,
  cd_cargo              smallint NOT NULL,
  ds_cargo              text NOT NULL,
  sg_uf                 text NOT NULL,
  sg_partido            text,
  nm_partido            text,

  -- Totais
  total_receitas        numeric(18, 2) NOT NULL DEFAULT 0,
  total_registros       integer NOT NULL DEFAULT 0,

  -- Breakdown por fonte
  fefc                  numeric(18, 2) NOT NULL DEFAULT 0,  -- Fundo Especial
  fundo_partidario      numeric(18, 2) NOT NULL DEFAULT 0,  -- Fundo Partidário
  recursos_proprios     numeric(18, 2) NOT NULL DEFAULT 0,  -- Recursos próprios
  outros_recursos       numeric(18, 2) NOT NULL DEFAULT 0,  -- Outras fontes

  -- Ranking (preenchido pelo analytics job)
  posicao               integer,
  posicao_cargo         integer,  -- ranking só entre deputados ou senadores

  -- Dados completos
  por_origem            jsonb,   -- breakdown por ds_origem_receita
  top_doadores          jsonb,   -- top 10 doadores com valor

  atualizado_em         timestamptz NOT NULL DEFAULT now(),

  UNIQUE (sq_candidato, ano_eleicao)
);

CREATE INDEX IF NOT EXISTS idx_tse_agg_ano          ON tse_candidatos_receitas_agg (ano_eleicao);
CREATE INDEX IF NOT EXISTS idx_tse_agg_cargo        ON tse_candidatos_receitas_agg (cd_cargo, ano_eleicao);
CREATE INDEX IF NOT EXISTS idx_tse_agg_uf           ON tse_candidatos_receitas_agg (sg_uf, ano_eleicao);
CREATE INDEX IF NOT EXISTS idx_tse_agg_partido      ON tse_candidatos_receitas_agg (sg_partido, ano_eleicao);
CREATE INDEX IF NOT EXISTS idx_tse_agg_total        ON tse_candidatos_receitas_agg (total_receitas DESC, ano_eleicao);
CREATE INDEX IF NOT EXISTS idx_tse_agg_posicao      ON tse_candidatos_receitas_agg (posicao, ano_eleicao);
