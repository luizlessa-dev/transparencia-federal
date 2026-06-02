-- Refinamento do cross familiar:
-- 1) Exclui sobrenomes genéricos (top 40 mais comuns no Brasil).
-- 2) Limita empresas a capital < R$ 1 bi (bancos/estatais viram ruído puro).
-- 3) Mínimo de 6 letras no sobrenome (filtra LIMA, ROSA, etc).

drop view if exists cvm_socio_politico;

-- Lista de sobrenomes genéricos a ignorar na detecção de familiares.
create table if not exists sobrenome_blocklist (
  sobrenome text primary key
);
insert into sobrenome_blocklist values
  ('SILVA'),('SANTOS'),('OLIVEIRA'),('SOUZA'),('RODRIGUES'),('FERREIRA'),
  ('ALVES'),('PEREIRA'),('LIMA'),('GOMES'),('COSTA'),('RIBEIRO'),('MARTINS'),
  ('CARVALHO'),('ALMEIDA'),('LOPES'),('SOUSA'),('FERNANDES'),('VIEIRA'),
  ('BARBOSA'),('ROCHA'),('DIAS'),('NASCIMENTO'),('ANDRADE'),('MOREIRA'),
  ('NUNES'),('MARQUES'),('MACHADO'),('MENDES'),('FREITAS'),('CARDOSO'),
  ('RAMOS'),('GONÇALVES'),('ARAÚJO'),('ARAUJO'),('MELO'),('CUNHA'),
  ('TEIXEIRA'),('MONTEIRO'),('PINTO'),('MOURA'),('CAVALCANTE')
on conflict do nothing;

create or replace view cvm_socio_politico as
with pol as (
  select
    deputado_id::text as politico_id, nome as politico, sigla_partido, sigla_uf,
    score_total,
    trim(regexp_replace(regexp_replace(upper(unaccent(nome)), '[^A-Z0-9 ]', ' ', 'g'), '\s+', ' ', 'g')) as nome_norm,
    regexp_replace(coalesce(cpf, ''), '\D', '', 'g') as cpf_digits,
    'deputado' as tipo_parlamentar
  from cam_parlamentar_risco
  union all
  select
    codigo as politico_id, nome_completo as politico, partido as sigla_partido, uf as sigla_uf,
    null::numeric as score_total, nome_norm,
    '' as cpf_digits, 'senador' as tipo_parlamentar
  from sen_senadores
),
socios_pf as (
  select
    s.cnpj_basico, s.nome_socio, s.nome_norm, s.cpf_cnpj_socio, s.qualificacao,
    regexp_replace(coalesce(s.cpf_cnpj_socio, ''), '\D', '', 'g') as cpf_vis,
    reverse(split_part(reverse(s.nome_norm), ' ', 1)) as sobrenome_socio,
    e.capital_social
  from cnpj_socios s
  left join cnpj_empresa e on e.cnpj_basico = s.cnpj_basico
  where s.identificador = '2'
    and s.nome_norm is not null
    and length(s.nome_norm) > 6
)
-- Match direto (nome idêntico ao parlamentar)
select
  p.politico_id, p.politico, p.sigla_partido, p.sigla_uf, p.score_total,
  p.tipo_parlamentar,
  sp.cnpj_basico,
  e.razao_social  as empresa,
  e.capital_social,
  sp.qualificacao as papel_societario,
  sp.cpf_cnpj_socio as cpf_socio_mascarado,
  (length(p.cpf_digits) = 11 and nullif(sp.cpf_vis, '') = substr(p.cpf_digits, 4, 6)) as cpf_confirma,
  false           as familiar
from socios_pf sp
join pol p on p.nome_norm = sp.nome_norm
left join cnpj_empresa e on e.cnpj_basico = sp.cnpj_basico

union all

-- Match familiar (mesmo sobrenome, nome diferente, capital < R$1bi, sobrenome não-genérico)
select
  p.politico_id, p.politico, p.sigla_partido, p.sigla_uf, p.score_total,
  p.tipo_parlamentar,
  sp.cnpj_basico,
  e.razao_social  as empresa,
  e.capital_social,
  sp.qualificacao as papel_societario,
  sp.cpf_cnpj_socio as cpf_socio_mascarado,
  false           as cpf_confirma,
  true            as familiar
from socios_pf sp
join pol p
  on p.nome_norm != sp.nome_norm
 and reverse(split_part(reverse(p.nome_norm), ' ', 1)) = sp.sobrenome_socio
left join cnpj_empresa e on e.cnpj_basico = sp.cnpj_basico
where length(sp.sobrenome_socio) >= 6
  and sp.sobrenome_socio not in (select sobrenome from sobrenome_blocklist)
  and coalesce(sp.capital_social, 0) < 1000000000;  -- < R$ 1 bilhão
