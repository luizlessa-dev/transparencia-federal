-- ───────────────────────────────────────────────────────────────────────────
-- Eixo Voos (#1) — passagens aéreas da cota do Senado (CEAPS).
--
-- Fonte: ceaps_senado_brutas (tipo_despesa ilike '%passagens aéreas%').
-- O campo `detalhamento` é texto semiestruturado e traz o que a Câmara não tem:
-- companhia real, localizador, passageiro + vínculo, nº do voo, trecho e data.
--
-- O job analytics `job_voos_senado` faz o parsing e materializa estas tabelas
-- (derivadas — recriadas inteiras a cada execução). Taxa de detalhe completo
-- ~98,7% sobre ~24,5 mil voos; o resto é truncado na fonte (companhia/valor
-- ainda contam). Passagens terrestres/aquáticas da mesma categoria são excluídas.
-- ───────────────────────────────────────────────────────────────────────────

-- 1) Nível-perna: 1 linha por (passageiro × trecho voado).
create table if not exists voos_senado (
  id                    bigint generated always as identity primary key,
  cod_documento         text not null,
  ano                   integer not null,
  mes                   integer,
  senador_normalizado   text,
  companhia             text not null,        -- canônica (AZUL/GOL/LATAM…) ou nome bruto
  companhia_eh_aerea    boolean not null default false, -- false = reserva via agência
  agencia               text,                 -- nome bruto quando não é aérea conhecida
  localizador           text,
  passageiro            text,
  vinculo               text,                 -- PARLAMENTAR | COMISSIONADO | … | NÃO INFORMADO
  eh_parlamentar        boolean not null default false,
  voo_numero            text,
  origem                text,                 -- IATA 3 letras
  destino               text,                 -- IATA 3 letras
  data_voo              date,
  valor_reembolsado_doc numeric(14,2),        -- valor do documento (não da perna)
  raw_detalhamento      text,
  atualizado_em         timestamptz not null default now()
);

comment on table voos_senado is
  'Passagens aéreas da cota do Senado, nível-perna, parseadas de '
  'ceaps_senado_brutas.detalhamento. valor_reembolsado_doc é por documento '
  '(cod_documento) — agregações de gasto devem deduplicar por documento.';

create index if not exists idx_voos_senado_senador on voos_senado (senador_normalizado);
create index if not exists idx_voos_senado_companhia on voos_senado (companhia);
create index if not exists idx_voos_senado_terceiro on voos_senado (eh_parlamentar);
create index if not exists idx_voos_senado_ano on voos_senado (ano);
create index if not exists idx_voos_senado_doc on voos_senado (cod_documento);

-- 2) Agregado por parlamentar × ano (gasto deduplicado por documento).
create table if not exists voos_senado_parlamentar_agg (
  senador_normalizado   text,
  ano                   integer not null,
  total_gasto           numeric(14,2) not null default 0,
  n_documentos          integer not null default 0,
  n_trechos             integer not null default 0,
  n_trechos_terceiros   integer not null default 0,
  ticket_medio          numeric(14,2) not null default 0,
  posicao               integer,
  atualizado_em         timestamptz not null default now()
);

create index if not exists idx_voos_parl_agg_ano on voos_senado_parlamentar_agg (ano);
create index if not exists idx_voos_parl_agg_gasto on voos_senado_parlamentar_agg (total_gasto desc);

-- 3) Agregado por companhia × ano (share de faturamento da cota).
create table if not exists voos_senado_companhia_agg (
  companhia             text not null,
  ano                   integer not null,
  total_gasto           numeric(14,2) not null default 0,
  n_documentos          integer not null default 0,
  n_trechos             integer not null default 0,
  share_pct             numeric(6,2) not null default 0,
  posicao               integer,
  atualizado_em         timestamptz not null default now()
);

create index if not exists idx_voos_comp_agg_ano on voos_senado_companhia_agg (ano);
create index if not exists idx_voos_comp_agg_gasto on voos_senado_companhia_agg (total_gasto desc);

-- 4) Terceiros: voos pagos pela cota em nome de não-parlamentar (vínculo conhecido).
create table if not exists voos_senado_terceiros_agg (
  passageiro            text not null,
  vinculo               text,
  senador_normalizado   text,
  n_trechos             integer not null default 0,
  atualizado_em         timestamptz not null default now()
);

create index if not exists idx_voos_terc_agg_trechos on voos_senado_terceiros_agg (n_trechos desc);
