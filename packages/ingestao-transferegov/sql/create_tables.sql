-- Tabelas para ingestão do TransfereGov (TED e FAF)
-- Fonte: api.transferegov.gestao.gov.br (PostgREST público)

-- ──────────────────────────────────────────────
-- TED — Termos de Execução Descentralizada
-- ──────────────────────────────────────────────

create table if not exists ted_planos_acao (
  id_plano_acao          integer primary key,
  id_programa            integer,
  sigla_unidade_descentralizada  text,
  unidade_descentralizada        text,
  sigla_unidade_execucao         text,
  unidade_execucao               text,
  valor_total                    numeric,
  data_inicio_vigencia           date,
  data_fim_vigencia              date,
  objeto                         text,
  situacao                       text,
  ano                            integer,
  forma_execucao_direta          boolean,
  forma_execucao_particulares    boolean,
  forma_execucao_descentralizada boolean,
  valor_beneficiario_especifico  numeric,
  valor_chamamento_publico       numeric,
  dados                          jsonb,
  atualizado_em                  timestamptz default now()
);

create index if not exists idx_ted_planos_acao_situacao on ted_planos_acao (situacao);
create index if not exists idx_ted_planos_acao_ano      on ted_planos_acao (ano);

create table if not exists ted_termos_execucao (
  id_termo           integer primary key,
  id_plano_acao      integer references ted_planos_acao (id_plano_acao),
  situacao           text,
  numero_processo_sei text,
  numero_ns          text,
  data_assinatura    date,
  data_divulgacao    date,
  data_recebimento   date,
  data_efetivacao    date,
  minuta_padrao      boolean,
  dados              jsonb,
  atualizado_em      timestamptz default now()
);

create index if not exists idx_ted_termos_plano on ted_termos_execucao (id_plano_acao);
create index if not exists idx_ted_termos_situacao on ted_termos_execucao (situacao);

-- ──────────────────────────────────────────────
-- FAF — Fundo a Fundo
-- ──────────────────────────────────────────────

create table if not exists faf_planos_acao (
  id_plano_acao              integer primary key,
  codigo                     text,
  data_inicio_vigencia       date,
  data_fim_vigencia          date,
  situacao                   text,
  id_programa                integer,

  -- Repassador (órgão federal)
  sigla_orgao_repassador     text,
  cnpj_orgao_repassador      text,
  nome_orgao_repassador      text,

  -- Fundo repassador
  cnpj_fundo_repassador      text,
  nome_fundo_repassador      text,
  uf_fundo_repassador        text,

  -- Recebedor (ente municipal/estadual)
  cnpj_ente_recebedor        text,
  nome_ente_recebedor        text,
  uf_recebedor               text,
  municipio_recebedor        text,
  ibge_recebedor             integer,

  -- Fundo recebedor
  cnpj_fundo_recebedor       text,
  nome_fundo_recebedor       text,
  uf_fundo_recebedor         text,
  municipio_fundo_recebedor  text,
  ibge_fundo_recebedor       integer,

  -- Valores
  valor_total                numeric,
  valor_repasse_total        numeric,
  valor_repasse_emenda       numeric,
  valor_repasse_voluntario   numeric,
  valor_recursos_proprios    numeric,
  valor_custeio              numeric,
  valor_investimento         numeric,
  valor_saldo_disponivel     numeric,

  dados                      jsonb,
  atualizado_em              timestamptz default now()
);

create index if not exists idx_faf_planos_situacao    on faf_planos_acao (situacao);
create index if not exists idx_faf_planos_uf          on faf_planos_acao (uf_recebedor);
create index if not exists idx_faf_planos_ibge        on faf_planos_acao (ibge_recebedor);
create index if not exists idx_faf_planos_orgao       on faf_planos_acao (sigla_orgao_repassador);
create index if not exists idx_faf_planos_cnpj_rec    on faf_planos_acao (cnpj_ente_recebedor);
