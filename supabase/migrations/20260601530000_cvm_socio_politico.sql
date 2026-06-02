-- ───────────────────────────────────────────────────────────────────────────
-- Cross #2 — sócios de empresas do mercado de capitais que são parlamentares.
-- Liga cnpj_socios (QSA enxuto) × cam_parlamentar_risco por NOME normalizado,
-- com CORROBORAÇÃO por CPF parcial: a Receita mascara o CPF do sócio mostrando
-- só os 6 dígitos centrais (pos. 4-9); comparamos com o miolo do CPF completo do
-- parlamentar. cpf_confirma=true ⇒ match forte; false ⇒ LEAD por nome (homônimo
-- possível) — a apurar, NUNCA acusação (mesma política da folha de gabinete).
-- ───────────────────────────────────────────────────────────────────────────

create extension if not exists unaccent;

create or replace view cvm_socio_politico as
with pol as (
  select
    deputado_id, nome, sigla_partido, sigla_uf, score_total,
    trim(regexp_replace(regexp_replace(upper(unaccent(nome)), '[^A-Z0-9 ]', ' ', 'g'), '\s+', ' ', 'g')) as nome_norm,
    regexp_replace(coalesce(cpf, ''), '\D', '', 'g') as cpf_digits
  from cam_parlamentar_risco
),
socios_pf as (
  select
    cnpj_basico, nome_socio, nome_norm, cpf_cnpj_socio, qualificacao,
    regexp_replace(coalesce(cpf_cnpj_socio, ''), '\D', '', 'g') as cpf_vis
  from cnpj_socios
  where identificador = '2' and nome_norm is not null and length(nome_norm) > 6
)
select
  p.deputado_id,
  p.nome             as politico,
  p.sigla_partido,
  p.sigla_uf,
  p.score_total,
  sp.cnpj_basico,
  e.razao_social     as empresa,
  e.capital_social,
  sp.qualificacao    as papel_societario,
  sp.cpf_cnpj_socio  as cpf_socio_mascarado,
  (length(p.cpf_digits) = 11 and nullif(sp.cpf_vis, '') = substr(p.cpf_digits, 4, 6)) as cpf_confirma
from socios_pf sp
join pol p on p.nome_norm = sp.nome_norm
left join cnpj_empresa e on e.cnpj_basico = sp.cnpj_basico;
