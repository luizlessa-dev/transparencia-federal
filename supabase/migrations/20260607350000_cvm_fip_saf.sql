-- ───────────────────────────────────────────────────────────────────────────
-- Eixo SAF × FIPs — passo D.
--
-- FIPs com participação conhecida ou inferida em SAFs brasileiras.
-- Limitação da fonte: carteira de FIP fechado NÃO é dado aberto na CVM.
-- A ligação é inferida por: (a) nome do fundo, (b) padrão de cotistas,
-- (c) informações públicas (prospectos, notícias, registros CVM).
--
-- Descoberta (jun/2026):
--   Além do Galo Forte (Atlético-MG, já publicado), existem ao menos 5 outros
--   FIPs no ecossistema SAF com informes disponíveis na CVM.
-- ───────────────────────────────────────────────────────────────────────────

-- Seed: FIPs mapeados ao ecossistema SAF.
create table if not exists cvm_fip_saf (
  cnpj_fip        text primary key,
  clube           text,             -- SAF provável ou 'multi' para portfólio
  nome_fip        text,
  papel           text,             -- 'master' | 'feeder' | 'direto' | 'imobiliario'
  vinculo         text,             -- como o vinculo foi estabelecido
  confirmado      boolean default false,  -- true = comprovado, false = inferido
  obs             text,
  atualizado_em   timestamptz not null default now()
);

comment on table cvm_fip_saf is
  'FIPs com participação confirmada ou inferida em SAFs brasileiras. '
  'Carteira de FIP é confidencial; vínculo estabelecido por nome, cotistas e fontes públicas.';

insert into cvm_fip_saf (cnpj_fip, clube, nome_fip, papel, vinculo, confirmado, obs) values
  (
    '51856050000106', 'Atlético Mineiro',
    'GALO FORTE FUNDO DE INVESTIMENTO EM PARTICIPAÇÕES MULTIESTRATÉGIA',
    'direto', 'nome + informe CVM + reportagem (detém 26,88% da SAF)',
    true,
    '1 cotista PF, 100% PF, PL R$293M. Caso publicado em /mercado-de-capitais/galo-forte.'
  ),
  (
    '41063438000104', 'Atlético Mineiro',
    'GALOP FARMS FUNDO DE INVESTIMENTO EM PARTICIPAÇÕES MULTIESTRATÉGIA RESPONSABILIDADE LIMITADA',
    'direto', 'nome (família Galo/Galop) + gestor vinculado ao ecossistema Menin/MRV',
    false,
    '5 cotistas, 8,82% PF, PL R$31M. Segundo veículo inferido do ecossistema Atlético-MG. '
    'Investigar se mesmos gestores do Galo Forte.'
  ),
  (
    '12595306000117', 'Botafogo',
    'BOTAFOGO FUNDO DE INVESTIMENTO EM PARTICIPAÇÕES MULTIESTRATÉGIA INVESTIMENTO NO EXTERIOR',
    'direto', 'nome + estrutura John Textor (Eagle Football Holdings)',
    false,
    'PL R$225M, 93,14% PF mas 0 cotistas declarados no último informe (inconsistência). '
    'Provavelmente veículo de investimento do Textor na Botafogo SAF.'
  ),
  (
    '19195424000187', 'Botafogo',
    'FUNDO DE INVESTIMENTO EM PARTICIPAÇÕES NOVO HOTEL BOTAFOGO EMPRESAS EMERGENTES',
    'imobiliario', 'nome do clube + ativo imobiliário (Hotel Botafogo, RJ)',
    false,
    'PL R$73M, 1 cotista PJ. Provável veículo imobiliário do clube, não da SAF. '
    'Incluído para mapeamento completo do ecossistema financeiro do clube.'
  ),
  (
    '52019407000164', 'multi',
    'SPORTS MEDIA FUTEBOL BRASILEIRO FIP MULTIESTRATÉGIA - RESPONSABILIDADE LIMITADA',
    'master', 'nome + perfil de cotistas (7 institucionais) + oferta CVM R$1bi',
    true,
    'Master fund. PL R$1,34bi, capital integralizado R$958M. '
    '7 cotistas PJ institucionais. Portfólio multi-clube (Botafogo, Cruzeiro, Vasco, outros). '
    'Fundo feeder: Sports Media Advisory (CNPJ 51931205000121, 7284 cotistas).'
  ),
  (
    '51931205000121', 'multi',
    'SPORTS MEDIA FUTEBOL BRASILEIRO ADVISORY FUNDO DE INVESTIMENTO EM PARTICIPAÇÕES MULTIESTRATÉGIA',
    'feeder', 'par do master (52019407000164) + oferta CVM de cotas R$1bi',
    true,
    'Feeder fund distribuído ao varejo. PL R$530M, 7.284 cotistas. '
    'Distribui para o master Sports Media FIP. Maior base de investidores pessoa física no futebol.'
  )
on conflict (cnpj_fip) do update
  set clube = excluded.clube, nome_fip = excluded.nome_fip,
      papel = excluded.papel, vinculo = excluded.vinculo,
      confirmado = excluded.confirmado, obs = excluded.obs,
      atualizado_em = now();

-- ───────────────────────────────────────────────────────────────────────────
-- View: resumo consolidado — último informe de cada FIP-SAF.
-- ───────────────────────────────────────────────────────────────────────────
create or replace view fip_saf_resumo as
with ultimo as (
  select distinct on (cnpj_norm)
    cnpj_norm, dt_comptc, vl_patrim_liq, vl_cap_integr, vl_cap_compr,
    nr_cotst, pr_pf, pr_pj_nfin, pr_banco, pr_pj_fin, pr_rpps, pr_efpc
  from cvm_fip_informe
  where cnpj_norm in (select cnpj_fip from cvm_fip_saf)
  order by cnpj_norm, dt_comptc desc
)
select
  fs.clube,
  fs.papel,
  fs.confirmado,
  fs.nome_fip,
  fs.cnpj_fip,
  u.dt_comptc        as ultimo_informe,
  u.vl_patrim_liq    as pl,
  u.vl_cap_integr    as cap_integralizado,
  u.vl_cap_compr     as cap_comprometido,
  u.nr_cotst         as cotistas,
  u.pr_pf            as pct_pf,
  u.pr_pj_nfin       as pct_pj_nfin,
  u.pr_banco         as pct_banco,
  u.pr_efpc          as pct_efpc,
  fs.vinculo,
  fs.obs
from cvm_fip_saf fs
left join ultimo u on u.cnpj_norm = fs.cnpj_fip
order by coalesce(u.vl_patrim_liq, 0) desc;

comment on view fip_saf_resumo is
  'FIPs do ecossistema SAF com último informe CVM disponível. '
  'confirmado=true: vínculo comprovado. false: inferido por nome/estrutura.';

-- ───────────────────────────────────────────────────────────────────────────
-- Adiciona FIPs SAF às entidades relacionadas para o próximo ciclo de QSA.
-- (gestores/admins desses FIPs ainda não mapeados — cadastro nulo na CVM)
-- ───────────────────────────────────────────────────────────────────────────
insert into cvm_saf_entidade_relacionada (cnpj_norm, clube, descricao, nome) values
  ('41063438000104', 'Atlético Mineiro', 'FIP', 'GALOP FARMS FIP MULTIESTRATÉGIA'),
  ('12595306000117', 'Botafogo',         'FIP', 'BOTAFOGO FIP MULTIESTRATÉGIA INVESTIMENTO NO EXTERIOR'),
  ('19195424000187', 'Botafogo',         'FIP', 'FIP NOVO HOTEL BOTAFOGO EMPRESAS EMERGENTES'),
  ('52019407000164', 'multi',            'FIP', 'SPORTS MEDIA FUTEBOL BRASILEIRO FIP MULTIESTRATÉGIA'),
  ('51856050000106', 'Atlético Mineiro', 'FIP', 'GALO FORTE FIP MULTIESTRATÉGIA')
on conflict (cnpj_norm) do update
  set descricao = excluded.descricao, nome = excluded.nome, atualizado_em = now();
