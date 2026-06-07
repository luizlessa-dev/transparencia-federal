-- Corrige saf_ecossistema_cvm: remove fuzzy match por nome (falsos positivos)
-- e usa apenas CNPJ direto (cvm_saf) + entidades mapeadas (cvm_saf_entidade_relacionada).
create or replace view saf_ecossistema_cvm as
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

select
  e.clube,
  coalesce(s.serie, '?')              as serie,
  coalesce(s.investidor, e.descricao) as investidor,
  o.cnpj_emissor,
  o.nome_emissor,
  o.tipo_ativo,
  o.valor,
  o.data_oferta,
  o.situacao,
  o.rito,
  o.id_oferta,
  'ecossistema'::text as relacao,
  e.descricao         as papel_entidade
from cvm_saf_entidade_relacionada e
join cvm_oferta o on o.cnpj_emissor = e.cnpj_norm
left join cvm_saf s on s.clube = e.clube;

comment on view saf_ecossistema_cvm is
  'Emissões CVM ligadas às SAFs: diretas (cnpj da SAF) + ecossistema '
  '(holdings, FIDCs, FIPs mapeados em cvm_saf_entidade_relacionada). '
  'Sem fuzzy match por nome — evita falsos positivos históricos.';
