-- Adiciona colunas de Restos a Pagar à tabela emendas
-- Fonte: API Portal da Transparência (campos valorRestoInscrito/Cancelado/Pago)
-- Motivação: detecta dinheiro do orçamento secreto efetivamente pago
-- via execução tardia (anos posteriores ao empenho).

alter table emendas
  add column if not exists valor_resto_inscrito  numeric default 0,
  add column if not exists valor_resto_cancelado numeric default 0,
  add column if not exists valor_resto_pago      numeric default 0;

comment on column emendas.valor_resto_inscrito  is 'Valor inscrito em Restos a Pagar (não pago no ano de empenho).';
comment on column emendas.valor_resto_cancelado is 'Valor de Restos a Pagar cancelado em anos posteriores.';
comment on column emendas.valor_resto_pago      is 'Valor pago via Restos a Pagar em anos posteriores ao empenho. CRÍTICO para análise do orçamento secreto.';
