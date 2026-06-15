-- Publicações do Diário Oficial da União (DOU)
-- Fonte: API pública in.gov.br/consulta (temporária) → Inlabs XML (futuro)

create table if not exists dou_publicacoes (
  id                  bigserial primary key,
  id_externo          text not null unique,           -- classPK do portal
  secao               text not null,                  -- do1, do2, do3
  data_publicacao     date not null,
  tipo_ato            text,                           -- Portaria, Resolução, Edital...
  titulo              text,
  orgao               text,                           -- hierarchyStr (órgão publicador)
  conteudo_html       text,
  cpfs_extraidos      text[] not null default '{}',
  cnpjs_extraidos     text[] not null default '{}',
  url_titulo          text,
  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now()
);

create index if not exists dou_publicacoes_data_idx    on dou_publicacoes (data_publicacao desc);
create index if not exists dou_publicacoes_secao_idx   on dou_publicacoes (secao);
create index if not exists dou_publicacoes_cpfs_idx    on dou_publicacoes using gin (cpfs_extraidos);
create index if not exists dou_publicacoes_cnpjs_idx   on dou_publicacoes using gin (cnpjs_extraidos);

-- Alertas de cruzamento: publicação DOU ↔ funcionário ou doador conhecido
create table if not exists dou_alertas_cruzamento (
  id                  bigserial primary key,
  id_externo          text not null,                  -- FK lógica → dou_publicacoes.id_externo
  titulo              text,
  data_publicacao     date,
  orgao               text,
  tipo_match          text not null,                  -- 'cpf_funcionario' | 'cnpj_doador'
  valor_match         text not null,                  -- o CPF ou CNPJ que cruzou
  criado_em           timestamptz not null default now(),
  unique (id_externo, tipo_match, valor_match)
);

create index if not exists dou_alertas_data_idx  on dou_alertas_cruzamento (data_publicacao desc);
create index if not exists dou_alertas_match_idx on dou_alertas_cruzamento (tipo_match, valor_match);
