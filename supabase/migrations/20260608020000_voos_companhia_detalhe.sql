-- ───────────────────────────────────────────────────────────────────────────
-- Eixo Voos — agregados de detalhe por companhia (página entity-first /voos/companhia).
-- Derivados do parsing do Senado (voos_senado), materializados por job_voos_senado.
-- ───────────────────────────────────────────────────────────────────────────

-- Quais parlamentares mais usaram cada companhia (Senado).
create table if not exists voos_senado_companhia_senador_agg (
  companhia             text not null,
  senador_normalizado   text,
  n_trechos             integer not null default 0,
  n_documentos          integer not null default 0,
  atualizado_em         timestamptz not null default now()
);
create index if not exists idx_vcsa_companhia on voos_senado_companhia_senador_agg (companhia);
create index if not exists idx_vcsa_trechos on voos_senado_companhia_senador_agg (n_trechos desc);

-- Rotas mais voadas por companhia (Senado).
create table if not exists voos_senado_rota_agg (
  companhia             text not null,
  origem                text,
  destino               text,
  n_trechos             integer not null default 0,
  atualizado_em         timestamptz not null default now()
);
create index if not exists idx_vra_companhia on voos_senado_rota_agg (companhia);
create index if not exists idx_vra_trechos on voos_senado_rota_agg (n_trechos desc);
