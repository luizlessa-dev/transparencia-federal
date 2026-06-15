create table if not exists noticias (
  slug        text primary key,
  titulo      text not null,
  resumo      text not null,
  tag         text not null,
  data_pub    date not null,
  publicado   boolean not null default false,
  destaque    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- seed: matéria já publicada
insert into noticias (slug, titulo, resumo, tag, data_pub, publicado, destaque)
values (
  'nutridores-mg',
  'MG pagou R$ 231 mi a empresa condenada por burlar a proibição de contratar',
  'A NUTRIDORES recebeu 166 empenhos da SEJUSP após a condenação pela CGE-MG transitar em julgado administrativamente. A ironia: a empresa foi punida por burlar o direito de contratar — e seguiu recebendo.',
  'Governo MG',
  '2026-06-02',
  true,
  true
)
on conflict (slug) do nothing;
