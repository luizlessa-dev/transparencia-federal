-- ───────────────────────────────────────────────────────────────────────────
-- Eixo SAF × Mercado de Capitais — ofertas públicas registradas na CVM.
--
-- Duas camadas:
--   1. saf_oferta          — emissões DIRETAS pela SAF (match por CNPJ exato).
--   2. saf_ecossistema_cvm — entidades do ecossistema: holdings, FIDCs, FIPs
--                            e fundos intermediários vinculados ao nome do clube.
--
-- Descoberta (jun/2026):
--   Apenas 3 das 11 SAFs emitiram diretamente: Atlético-MG (R$105M debêntures),
--   Cruzeiro (R$50M notas comerciais), Cuiabá (R$20M debêntures).
--   Botafogo captou R$400M via holding (Botafogo Participações Ltda, não a SAF).
--   Coritiba usa fundo intermediário (FIF SAF Coritiba, 3 captações ~R$58M).
--   FIDC Atlético-MG adicional de R$90M (dez/2025).
--   Sports Media Futebol FIP: R$1bi (captação de portfólio, não clube específico).
-- ───────────────────────────────────────────────────────────────────────────

-- 1) Emissões diretas: join cvm_saf × cvm_oferta por cnpj_norm.
create or replace view saf_oferta as
select
  s.clube,
  s.serie,
  s.investidor,
  o.cnpj_emissor,
  o.nome_emissor,
  o.tipo_ativo,
  o.valor,
  o.data_oferta,
  o.situacao,
  o.rito,
  o.id_oferta,
  'direta' as relacao        -- a SAF é a emissora
from cvm_saf s
join cvm_oferta o on o.cnpj_emissor = s.cnpj_norm;

comment on view saf_oferta is
  'Emissões CVM feitas diretamente pelas SAFs (match por CNPJ). '
  'Apenas Atlético-MG, Cruzeiro e Cuiabá aparecem (jun/2026).';

-- 2) Ecossistema SAF: emissões diretas (por CNPJ da SAF) + entidades
--    relacionadas mapeadas em cvm_saf_entidade_relacionada.
--    NÃO usa busca por nome — falsos positivos demais ("Bahia" → bancos baianos,
--    "Cruzeiro" → Cruzeiro do Sul Educacional, etc.).
create or replace view saf_ecossistema_cvm as
-- emissões diretas pela SAF
select
  s.clube,
  s.serie,
  s.investidor,
  o.cnpj_emissor,
  o.nome_emissor,
  o.tipo_ativo,
  o.valor,
  o.data_oferta,
  o.situacao,
  o.rito,
  o.id_oferta,
  'direta'::text as relacao,
  null::text     as papel_entidade
from cvm_saf s
join cvm_oferta o on o.cnpj_emissor = s.cnpj_norm

union all

-- emissões por holdings, FIDCs e fundos intermediários mapeados
select
  e.clube,
  coalesce(s.serie, '?')  as serie,
  coalesce(s.investidor, e.descricao) as investidor,
  o.cnpj_emissor,
  o.nome_emissor,
  o.tipo_ativo,
  o.valor,
  o.data_oferta,
  o.situacao,
  o.rito,
  o.id_oferta,
  'ecossistema'::text     as relacao,
  e.descricao             as papel_entidade
from cvm_saf_entidade_relacionada e
join cvm_oferta o on o.cnpj_emissor = e.cnpj_norm
left join cvm_saf s on s.clube = e.clube;

comment on view saf_ecossistema_cvm is
  'Emissões CVM ligadas às SAFs: diretas (cnpj da SAF) + ecossistema '
  '(holdings, FIDCs, FIPs mapeados em cvm_saf_entidade_relacionada por CNPJ). '
  'Sem fuzzy match por nome — evita falsos positivos históricos.';

-- ── Entidades de ecossistema com CNPJs para expandir o QSA ─────────────────
-- Holdings, FIDCs e fundos intermediários mapeados manualmente (jun/2026).
-- O job-receita.ts inclui cvm_saf_entidade_relacionada no montarUniverso().
create table if not exists cvm_saf_entidade_relacionada (
  cnpj_norm   text primary key,
  clube       text not null,
  descricao   text,           -- papel: 'holding', 'FIDC', 'FIP', 'FIF'
  nome        text,
  atualizado_em timestamptz not null default now()
);

comment on table cvm_saf_entidade_relacionada is
  'Holdings, FIDCs e fundos intermediários vinculados às SAFs. '
  'Incluídos no universo QSA para revelar a cadeia de controle além da SAF direta.';

insert into cvm_saf_entidade_relacionada (cnpj_norm, clube, descricao, nome) values
  -- Botafogo: holding captou R$400M em Notas Comerciais (nov/2025)
  ('14413435000172', 'Botafogo',        'holding',  'BOTAFOGO PARTICIPACOES LTDA'),
  -- Coritiba: fundo intermediário da estrutura Treecorp (3 captações ~R$58M)
  ('52315276000162', 'Coritiba',        'FIF',      'FUNDO DE INVESTIMENTOS SAF CORITIBA FI EM COTAS DE FUNDOS'),
  -- Atlético-MG: FIDC adicional R$90M (dez/2025)
  ('63570081000185', 'Atlético Mineiro','FIDC',     'FIDC ATLETICO MINEIRO - RESPONSABILIDADE LIMITADA'),
  -- Sports Media FIP: fundo de portfólio do futebol brasileiro R$1bi (ago/2023)
  -- Não é clube específico, mas é o maior veículo de captação do setor
  ('51931205000121', 'multi',           'FIP',      'SPORTS MEDIA FUTEBOL BRASILEIRO ADVISORY FIP MULTIESTRATÉGIA'),
  -- FIDC São Paulo FC (não é SAF, mas registrado em cvm_oferta — relevante como benchmark)
  ('57777919000103', 'São Paulo FC',    'FIDC',     'FIDC SÃO PAULO FUTEBOL CLUBE - RESPONSABILIDADE LIMITADA'),
  -- FIDC genérico "Futebol" (recorrente, 2 emissões 2025-2026)
  ('60960463000127', 'multi',           'FIDC',     'FUTEBOL FUNDO DE INVESTIMENTO EM DIREITOS CREDITÓRIOS')
on conflict (cnpj_norm) do update
  set clube = excluded.clube,
      descricao = excluded.descricao,
      nome = excluded.nome,
      atualizado_em = now();
