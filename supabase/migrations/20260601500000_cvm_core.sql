-- ───────────────────────────────────────────────────────────────────────────
-- Eixo MERCADO DE CAPITAIS (CVM) — tabelas core do grafo de fundos.
-- Fonte: dados.cvm.gov.br (CKAN, licença ODbL — redistribuível).
--
-- Princípios (lições do eixo MG):
--   • SLIM: nada de jsonb com a linha inteira do CSV (mg_remuneracao chegou a
--     3,4 KB/linha e travou o disco). Só colunas usadas.
--   • UNIQUE NULLS NOT DISTINCT pra não colapsar/duplicar em resume.
--   • CNPJ sempre normalizado a 14 dígitos (cnpj_norm) pra cruzar com
--     portal_sancionados / mg_empresas_sancionadas / tse_receitas_brutas.
--
-- Realidade da fonte (recon 01/jun/2026):
--   • CDA (composição de carteira) só existe pro universo 555 (fundos abertos).
--     FIP/FIDC fechados NÃO declaram CDA → a cadeia fundo-sobre-fundo de FIPs
--     (ex. Galo Forte ← Olaf 95 ← Hans 95) NÃO é dado aberto. O grafo de
--     arestas cobre o universo 555.
--   • Informe de FIP é nível-fundo + distribuição de cotistas POR TIPO (não
--     nominal). Sustenta a história do Galo Forte (PL, cotistas), não a cadeia.
-- ───────────────────────────────────────────────────────────────────────────

-- 1) NÓS — cadastro de fundos. Um registro por CNPJ de fundo.
create table if not exists cvm_fundo (
  cnpj_norm         text not null,
  denom             text,
  tipo              text,           -- FI, FIP, FIDC, FII, CLASSES - FIP, ...
  situacao          text,           -- EM FUNCIONAMENTO NORMAL, CANCELADA, ...
  classe            text,
  classe_anbima     text,
  fundo_cotas       boolean,        -- é FIC (fundo de cotas de fundos)?
  data_registro     date,
  data_cancel       date,
  vl_patrim_liq     numeric,
  dt_patrim_liq     date,
  cnpj_admin        text,
  admin             text,
  cnpj_gestor       text,           -- CPF_CNPJ_GESTOR normalizado (quando PJ)
  gestor            text,
  cnpj_controlador  text,
  controlador       text,
  fonte             text default 'cad_fi',
  atualizado_em     timestamptz not null default now(),
  primary key (cnpj_norm)
);
create index if not exists idx_cvm_fundo_admin       on cvm_fundo(cnpj_admin) where cnpj_admin is not null;
create index if not exists idx_cvm_fundo_gestor      on cvm_fundo(cnpj_gestor) where cnpj_gestor is not null;
create index if not exists idx_cvm_fundo_controlador on cvm_fundo(cnpj_controlador) where cnpj_controlador is not null;
create index if not exists idx_cvm_fundo_tipo        on cvm_fundo(tipo);

-- 2) ARESTAS fundo→fundo (da CDA, universo 555). SÓ posições em cotas de
--    fundo — enxuto. O grafo se percorre por cnpj_fundo (detentor) e
--    cnpj_ativo (fundo detido).
create table if not exists cvm_carteira_edge (
  cnpj_fundo    text not null,      -- detentor
  cnpj_ativo    text not null,      -- fundo detido (cota)
  denom_ativo   text,
  tipo_aplic    text,
  vl_merc       numeric,            -- valor de mercado da posição
  dt_comptc     date not null,      -- competência (1º dia do mês de referência)
  atualizado_em timestamptz not null default now(),
  unique nulls not distinct (cnpj_fundo, cnpj_ativo, dt_comptc)
);
create index if not exists idx_cvm_edge_fundo on cvm_carteira_edge(cnpj_fundo);
create index if not exists idx_cvm_edge_ativo on cvm_carteira_edge(cnpj_ativo);

-- 3) Informe de FIP (nível fundo) — a história do Galo Forte.
--    % de cotistas POR TIPO (não nominal — limite da fonte).
create table if not exists cvm_fip_informe (
  cnpj_norm      text not null,
  denom          text,
  tipo           text,             -- FIP / CLASSES - FIP
  classe_cota    text,
  dt_comptc      date not null,
  vl_patrim_liq  numeric,
  qt_cota        numeric,
  vl_patrim_cota numeric,
  nr_cotst       integer,
  vl_cap_compr   numeric,          -- capital comprometido
  vl_cap_integr  numeric,          -- capital integralizado
  pr_pf          numeric,          -- % cotas subscritas por pessoa física
  pr_pj_nfin     numeric,          -- % PJ não-financeira
  pr_banco       numeric,
  pr_pj_fin      numeric,          -- % PJ financeira
  pr_rpps        numeric,          -- % regimes próprios de previdência
  pr_efpc        numeric,          -- % fundos de pensão
  fonte          text,             -- 'trimestral' | 'quadrimestral'
  atualizado_em  timestamptz not null default now(),
  unique nulls not distinct (cnpj_norm, classe_cota, dt_comptc)
);
create index if not exists idx_cvm_fip_cnpj on cvm_fip_informe(cnpj_norm);

-- 4) FIP → empresa investida (carteira de ativos do FIP).
--    ⚠️ Pode não existir em dados abertos (carteira de FIP é confidencial).
--    Tabela criada pro caso de a fonte surgir; fica vazia se não houver.
create table if not exists cvm_fip_participacao (
  cnpj_fip      text not null,
  cnpj_empresa  text,
  nome_empresa  text,
  vl_merc       numeric,
  dt_comptc     date not null,
  atualizado_em timestamptz not null default now(),
  unique nulls not distinct (cnpj_fip, cnpj_empresa, dt_comptc)
);
create index if not exists idx_cvm_fip_part_emp on cvm_fip_participacao(cnpj_empresa) where cnpj_empresa is not null;

-- 5) Ofertas públicas / emissores (debêntures, cotas, CRI/CRA, ações).
--    Base do cross emissor × sancionada e do tier institucional.
create table if not exists cvm_oferta (
  id_oferta     text,
  cnpj_emissor  text,
  nome_emissor  text,
  tipo_ativo    text,             -- Debênture, Cota de FIDC, CRI, CRA, Ação...
  valor         numeric,
  data_oferta   date,
  situacao      text,
  rito          text,             -- ICVM 400 / RCVM 160
  atualizado_em timestamptz not null default now(),
  unique nulls not distinct (id_oferta, cnpj_emissor, tipo_ativo)
);
create index if not exists idx_cvm_oferta_emissor on cvm_oferta(cnpj_emissor) where cnpj_emissor is not null;
