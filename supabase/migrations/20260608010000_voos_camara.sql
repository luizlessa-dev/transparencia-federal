-- ───────────────────────────────────────────────────────────────────────────
-- Eixo Voos (#1) — 2ª leva: passagens aéreas da cota da Câmara (CEAP).
--
-- Fonte: ceaps_brutas (tipo_despesa contém 'AÉRE': SIGEPA, REEMBOLSO, etc.).
-- A Câmara NÃO publica trecho nem passageiro — só fornecedor + valor. Logo, só
-- dois recortes: quanto cada deputado gasta com voo e quanto cada companhia
-- fatura da cota. nome_fornecedor traz a companhia (SIGEPA) ou a agência/aérea
-- por extenso (REEMBOLSO); normalizado pelo job analytics (job_voos_camara).
-- ───────────────────────────────────────────────────────────────────────────

-- 1) Gasto com voo por deputado × ano.
create table if not exists voos_camara_deputado_agg (
  deputado_id_externo   text not null,
  nome                  text,
  sigla_partido         text,
  sigla_uf              text,
  ano                   integer not null,
  total_gasto           numeric(14,2) not null default 0,
  n_documentos          integer not null default 0,
  posicao               integer,
  atualizado_em         timestamptz not null default now()
);

create index if not exists idx_voos_cam_dep_agg_ano on voos_camara_deputado_agg (ano);
create index if not exists idx_voos_cam_dep_agg_gasto on voos_camara_deputado_agg (total_gasto desc);

-- 2) Faturamento por companhia × ano (share da cota da Câmara).
create table if not exists voos_camara_companhia_agg (
  companhia             text not null,
  companhia_eh_aerea    boolean not null default false,
  ano                   integer not null,
  total_gasto           numeric(14,2) not null default 0,
  n_documentos          integer not null default 0,
  share_pct             numeric(6,2) not null default 0,
  posicao               integer,
  atualizado_em         timestamptz not null default now()
);

create index if not exists idx_voos_cam_comp_agg_ano on voos_camara_companhia_agg (ano);
create index if not exists idx_voos_cam_comp_agg_gasto on voos_camara_companhia_agg (total_gasto desc);
