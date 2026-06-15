-- Convênios federais (Portal da Transparência)
-- Fonte: GET /convenios?uf={UF} — cobertura nacional por iteração de 27 UFs

CREATE TABLE IF NOT EXISTS convenios (
  id                    bigserial PRIMARY KEY,
  id_portal             bigint NOT NULL UNIQUE,

  -- Identificação do convênio
  numero                text,
  codigo                text,
  objeto                text,
  situacao              text,
  tipo_instrumento      text,
  numero_processo       text,

  -- Datas
  data_publicacao       date,
  data_inicio_vigencia  date,
  data_final_vigencia   date,
  data_ultima_liberacao date,
  data_conclusao        date,

  -- Convenente (quem recebe os recursos)
  convenente_cnpj       text,
  convenente_cpf        text,
  convenente_nome       text,
  convenente_tipo       text,

  -- Localidade
  municipio_ibge        text,
  municipio_nome        text,
  uf                    text,

  -- Órgão concedente
  orgao_siafi           text,
  orgao_cnpj            text,
  orgao_sigla           text,
  orgao_nome            text,
  orgao_poder           text,
  orgao_maximo_codigo   text,
  orgao_maximo_sigla    text,
  orgao_maximo_nome     text,

  -- Unidade gestora
  ug_codigo             text,
  ug_nome               text,

  -- Classificação orçamentária
  subfuncao_codigo      text,
  subfuncao_descricao   text,
  funcao_codigo         text,
  funcao_descricao      text,

  -- Valores
  valor                 numeric(18,2),
  valor_liberado        numeric(18,2),
  valor_contrapartida   numeric(18,2),
  valor_ultima_liberacao numeric(18,2),

  -- Raw
  dados                 jsonb,
  atualizado_em         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_convenios_uf               ON convenios (uf);
CREATE INDEX IF NOT EXISTS idx_convenios_situacao         ON convenios (situacao);
CREATE INDEX IF NOT EXISTS idx_convenios_convenente_cnpj  ON convenios (convenente_cnpj);
CREATE INDEX IF NOT EXISTS idx_convenios_orgao_maximo     ON convenios (orgao_maximo_codigo);
CREATE INDEX IF NOT EXISTS idx_convenios_vigencia         ON convenios (data_inicio_vigencia, data_final_vigencia);
CREATE INDEX IF NOT EXISTS idx_convenios_municipio        ON convenios (municipio_ibge);

COMMENT ON TABLE convenios IS
  'Convênios federais do Portal da Transparência. '
  'Cobertura nacional via iteração por UF (27 estados + DF). '
  'Chave natural: id_portal (classPK da API).';

GRANT SELECT ON convenios TO anon, authenticated;
