-- ───────────────────────────────────────────────────────────────────────────
-- Cross político ampliado: senadores + flag familiar por sobrenome.
-- Dropa a view anterior (colunas mudam de nome) antes de recriar.
-- ───────────────────────────────────────────────────────────────────────────
drop view if exists cvm_socio_politico;

-- Tabela de senadores (fonte: API legis.senado.leg.br/dadosabertos).
-- CPF não é público na API do Senado — match só por nome (igual deputados s/ CPF).
create table if not exists sen_senadores (
  codigo         text primary key,
  nome_completo  text,
  nome_norm      text,   -- sem acento, maiúsculo, só A-Z0-9 e espaço
  partido        text,
  uf             text,
  atualizado_em  timestamptz not null default now()
);
create index if not exists idx_sen_senadores_nome on sen_senadores(nome_norm) where nome_norm is not null;

-- View ampliada: deputados + senadores, com flag `familiar`.
-- `familiar` = sobrenome do sócio (última palavra do nome_norm) coincide com
-- o sobrenome de qualquer parlamentar — lead de nepotismo/empresa familiar
-- (NOT a acusação — exige apuração antes de publicar).
create or replace view cvm_socio_politico as
with pol as (
  -- Deputados
  select
    deputado_id::text as id, nome, sigla_partido, sigla_uf, score_total,
    trim(regexp_replace(regexp_replace(upper(unaccent(nome)), '[^A-Z0-9 ]', ' ', 'g'), '\s+', ' ', 'g')) as nome_norm,
    regexp_replace(coalesce(cpf, ''), '\D', '', 'g') as cpf_digits,
    'deputado' as tipo_parlamentar
  from cam_parlamentar_risco
  union all
  -- Senadores
  select
    codigo as id, nome_completo as nome, partido as sigla_partido, uf as sigla_uf,
    null::numeric as score_total, nome_norm,
    '' as cpf_digits, 'senador' as tipo_parlamentar
  from sen_senadores
),
sobrenomes_pol as (
  -- Último token do nome normalizado de cada parlamentar (sobrenome principal).
  select distinct
    reverse(split_part(reverse(nome_norm), ' ', 1)) as sobrenome
  from pol
  where length(nome_norm) > 4
),
socios_pf as (
  select
    cnpj_basico, nome_socio, nome_norm, cpf_cnpj_socio, qualificacao,
    regexp_replace(coalesce(cpf_cnpj_socio, ''), '\D', '', 'g') as cpf_vis,
    -- sobrenome do sócio = último token
    reverse(split_part(reverse(nome_norm), ' ', 1)) as sobrenome_socio
  from cnpj_socios
  where identificador = '2' and nome_norm is not null and length(nome_norm) > 6
)
select
  p.id                 as politico_id,
  p.nome               as politico,
  p.sigla_partido,
  p.sigla_uf,
  p.score_total,
  p.tipo_parlamentar,
  sp.cnpj_basico,
  e.razao_social       as empresa,
  e.capital_social,
  sp.qualificacao      as papel_societario,
  sp.cpf_cnpj_socio    as cpf_socio_mascarado,
  -- Match forte: CPF confirmado (só funciona quando pol tem CPF)
  (length(p.cpf_digits) = 11 and nullif(sp.cpf_vis, '') = substr(p.cpf_digits, 4, 6)) as cpf_confirma,
  false                as familiar  -- match direto: NÃO é familiar
from socios_pf sp
join pol p on p.nome_norm = sp.nome_norm
left join cnpj_empresa e on e.cnpj_basico = sp.cnpj_basico

union all

-- Familiares: sócio tem mesmo sobrenome que parlamentar, mas nome ≠
select
  p.id                 as politico_id,
  p.nome               as politico,
  p.sigla_partido,
  p.sigla_uf,
  p.score_total,
  p.tipo_parlamentar,
  sp.cnpj_basico,
  e.razao_social       as empresa,
  e.capital_social,
  sp.qualificacao      as papel_societario,
  sp.cpf_cnpj_socio    as cpf_socio_mascarado,
  false                as cpf_confirma,
  true                 as familiar
from socios_pf sp
join pol p on p.nome_norm != sp.nome_norm    -- nome diferente (não é o próprio)
          and reverse(split_part(reverse(p.nome_norm), ' ', 1)) = sp.sobrenome_socio
left join cnpj_empresa e on e.cnpj_basico = sp.cnpj_basico
where sp.sobrenome_socio in (select sobrenome from sobrenomes_pol)
  and length(sp.sobrenome_socio) >= 5;  -- filtra sobrenomes genéricos curtos (SILVA, etc virariam ruído)
