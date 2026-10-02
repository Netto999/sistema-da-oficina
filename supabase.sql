-- Sistema da Oficina: cole tudo isto no SQL Editor do Supabase e clique em Run.
create table if not exists public.docs (
  col text not null,
  id text not null,
  data jsonb not null,
  updated_at bigint not null default 0,
  primary key (col, id)
);
create index if not exists docs_col_updated on public.docs (col, updated_at);

create table if not exists public.ver (
  col text primary key,
  v bigint not null default 0
);

-- Segurança: ninguém de fora acessa as tabelas. Só o servidor da Vercel, com a chave secreta.
alter table public.docs enable row level security;
alter table public.ver enable row level security;
