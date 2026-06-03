-- ───────────────────────────────────────────────────────────────────────────
-- Eixo SAF — Sociedades Anônimas do Futebol brasileiras.
--
-- Lista-semente das SAFs constituídas com CNPJ confirmado (Receita/Econodata).
-- Serve como universo para o QSA: montarUniverso() inclui cnpj_norm daqui,
-- trazendo o quadro societário de cada SAF via cnpj_socios + cnpj_empresa.
--
-- Fontes: Econodata, CNPJ.biz, Linkana — pesquisa jun/2026.
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists cvm_saf (
  cnpj_norm        text primary key,   -- 14 dígitos sem pontuação
  clube            text not null,
  razao_social     text,
  serie            text,               -- 'A' | 'B' | 'C' | 'D' | 'Estadual'
  investidor       text,               -- controlador/investidor principal
  data_constituicao date,
  status           text default 'ativa',  -- 'ativa' | 'recuperacao_judicial'
  obs              text,
  atualizado_em    timestamptz not null default now()
);

comment on table cvm_saf is
  'Lista-semente das SAFs brasileiras constituídas. Serve de universo para ingestão QSA (Receita) e cruzamento CVM.';

create index if not exists idx_cvm_saf_clube on cvm_saf(clube);

-- ── Seed: 11 SAFs com CNPJ confirmado em bases públicas (jun/2026) ─────────
insert into cvm_saf (cnpj_norm, clube, razao_social, serie, investidor, data_constituicao, status, obs)
values
  ('44705141000185', 'Botafogo',        'S.A.F Botafogo',                                          'A', 'John Textor / Eagle Football Holdings',        '2021-12-30', 'ativa',               null),
  ('44490706000154', 'Cruzeiro',        'Cruzeiro Esporte Clube - Sociedade Anonima do Futebol',   'A', 'XP Investimentos / Grupo Zema (ex-Ronaldo)',    '2021-12-06', 'ativa',               null),
  ('47589413000117', 'Vasco da Gama',   'Vasco da Gama Sociedade Anonima do Futebol',              'A', '777 Partners (ex-controlador, disputado)',       '2022-08-16', 'recuperacao_judicial','Em recuperação judicial desde 2024'),
  ('49723699000107', 'Bahia',           'Esporte Clube Bahia S.A.F.',                              'A', 'City Football Group (CFG) / Manchester City',   '2023-02-27', 'ativa',               '90% CFG'),
  ('52177416000183', 'Atlético Mineiro','Atletico Mineiro S.A.F.',                                 'A', 'Galo Holding (Grupo Menin / MRV)',               '2023-09-14', 'ativa',               'Galo Forte FIP detém 26,88%'),
  ('43574008000174', 'América Mineiro', 'America Futebol Clube Sociedade Anonima do Futebol',      'B', 'Clube (sem investidor externo)',                  '2021-09-20', 'ativa',               null),
  ('04847144000139', 'Cuiabá',          'Cuiaba Esporte Clube - Sociedade Anonima do Futebol',     'B', 'Grupo Drebor',                                   '2001-12-19', 'ativa',               'Já era S.A. antes da Lei 14.193/2021'),
  ('45240156000188', 'Coritiba',        'Coritiba Sociedade Anonima do Futebol',                   'B', 'Treecorp Partners',                              '2022-02-10', 'ativa',               null),
  ('53406952000176', 'Fortaleza',       'Fortaleza EC SAF',                                        'A', 'Clube (SAF própria)',                             '2024-01-08', 'ativa',               null),
  ('59124551000100', 'Brusque',         'Brusque Futebol Clube Sociedade Anonima do Futebol',      'C', 'Almir Fioravante Camargo / Heitor Leite',        '2025-01-27', 'ativa',               null),
  ('46800175000184', 'Paraná Clube',    'Parana Clube - Sociedade Anonima do Futebol S.A.F.',      'Estadual', null,                                      '2022-06-15', 'ativa',               'Capital social declarado R$1 mil; em reestruturação')
on conflict (cnpj_norm) do update
  set clube            = excluded.clube,
      razao_social     = excluded.razao_social,
      serie            = excluded.serie,
      investidor       = excluded.investidor,
      data_constituicao= excluded.data_constituicao,
      status           = excluded.status,
      obs              = excluded.obs,
      atualizado_em    = now();

-- ───────────────────────────────────────────────────────────────────────────
-- View: quadro societário das SAFs — join cvm_saf × cnpj_socios × cnpj_empresa.
-- Produz a visão de "quem está atrás de cada SAF" para reportagem e API.
-- ───────────────────────────────────────────────────────────────────────────
create or replace view saf_quadro_societario as
select
  s.clube,
  s.serie,
  s.status,
  s.investidor,
  s.cnpj_norm                                      as cnpj_saf,
  left(s.cnpj_norm, 8)                             as cnpj_basico,
  so.nome_socio,
  so.identificador,                                -- 1=PJ, 2=PF, 3=estrangeiro
  so.cpf_cnpj_socio,
  so.qualificacao,
  so.data_entrada,
  so.faixa_etaria,
  -- se for sócio PJ, traz a razão social do sócio
  emp.razao_social                                 as razao_social_socio,
  emp.capital_social                               as capital_social_socio,
  emp.porte                                        as porte_socio,
  -- empresa-alvo (a própria SAF)
  saf_emp.razao_social                             as razao_social_saf,
  saf_emp.capital_social                           as capital_social_saf,
  saf_emp.natureza_juridica
from cvm_saf s
left join cnpj_socios so
  on so.cnpj_basico = left(s.cnpj_norm, 8)
left join cnpj_empresa saf_emp
  on saf_emp.cnpj_basico = left(s.cnpj_norm, 8)
-- sócio PJ: busca razão social do próprio sócio
left join cnpj_empresa emp
  on emp.cnpj_basico = left(regexp_replace(coalesce(so.cpf_cnpj_socio, ''), '\D', '', 'g'), 8)
  and so.identificador = '1';  -- só para sócios PJ

comment on view saf_quadro_societario is
  'Quadro societário das SAFs brasileiras: join cvm_saf × cnpj_socios × cnpj_empresa. Requer ingestão QSA com universo expandido (SAFs incluídas).';
