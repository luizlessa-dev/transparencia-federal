-- ───────────────────────────────────────────────────────────────────────────
-- Receita CNPJ/QSA — ENXUTO (filtrado pelo universo do mercado de capitais).
-- Fonte: dados abertos CNPJ da Receita (share público Nextcloud, WebDAV).
-- ⚠️ NUNCA a base inteira (25M sócios travam o disco). O job grava só os
-- CNPJs do nosso universo: gestores/administradores/controladores de fundos,
-- emissores de oferta e empresas sancionadas. Resolve "quem está atrás" dos
-- CNPJs do eixo CVM — ponte pro cross com políticos (TSE/parlamentares).
-- ───────────────────────────────────────────────────────────────────────────

-- Quadro societário (QSA). Sócio de PJ; CPF de PF vem MASCARADO pela Receita
-- (***NNNNNN**) — só os 6 dígitos centrais; nome é a chave principal de match.
create table if not exists cnpj_socios (
  cnpj_basico    text not null,         -- 8 primeiros dígitos da empresa
  identificador  text,                  -- 1=PJ, 2=PF, 3=estrangeiro
  nome_socio     text,
  nome_norm      text,                  -- normalizado (sem acento, maiúsculo) p/ join
  cpf_cnpj_socio text,                  -- CPF mascarado (PF) ou CNPJ (PJ)
  qualificacao   text,
  data_entrada   date,
  faixa_etaria   text,
  atualizado_em  timestamptz not null default now(),
  unique nulls not distinct (cnpj_basico, nome_socio, cpf_cnpj_socio)
);
create index if not exists idx_cnpj_socios_basico on cnpj_socios(cnpj_basico);
create index if not exists idx_cnpj_socios_nome   on cnpj_socios(nome_norm) where nome_norm is not null;

-- Dados da empresa (capital social, razão, porte) — só do universo.
create table if not exists cnpj_empresa (
  cnpj_basico       text primary key,
  razao_social      text,
  natureza_juridica text,
  capital_social    numeric,
  porte             text,
  atualizado_em     timestamptz not null default now()
);
