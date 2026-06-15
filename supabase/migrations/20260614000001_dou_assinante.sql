alter table dou_publicacoes add column if not exists assinante text;
create index if not exists dou_publicacoes_assinante_idx on dou_publicacoes (assinante);
