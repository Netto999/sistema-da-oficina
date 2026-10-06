-- Cópias de segurança automáticas do Sistema da Oficina.
-- Cole tudo no SQL Editor do Supabase e clique em Run (só precisa fazer uma vez).

create table if not exists public.backups (
  id bigserial primary key,
  criado_em timestamptz not null default now(),
  total int not null default 0,
  dados jsonb not null
);
alter table public.backups enable row level security;

-- Faz uma cópia de tudo (menos fotos e áudios, para não lotar o banco) e guarda só as 14 mais recentes.
create or replace function public.fazer_backup() returns json
language plpgsql security definer set search_path = public as $$
declare n int; bid bigint;
begin
  insert into public.backups(total, dados)
  select count(*), coalesce(jsonb_agg(jsonb_build_object('col', col, 'id', id, 'data', data)), '[]'::jsonb)
  from public.docs where col not in ('fotos', 'audios', 'evo')
  returning id, total into bid, n;
  delete from public.backups where id not in (select id from public.backups order by id desc limit 14);
  return json_build_object('id', bid, 'total', n);
end $$;

-- Volta os dados para uma cópia. Antes, guarda uma cópia do jeito que está agora (para poder desfazer).
create or replace function public.restaurar_backup(bid bigint) returns json
language plpgsql security definer set search_path = public as $$
declare d jsonb; agora bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint; n int;
begin
  select dados into d from public.backups where id = bid;
  if d is null then raise exception 'copia nao encontrada'; end if;
  perform public.fazer_backup();
  delete from public.docs where col not in ('fotos', 'audios', 'evo');
  insert into public.docs(col, id, data, updated_at)
  select e->>'col', e->>'id', e->'data', agora from jsonb_array_elements(d) e
  on conflict (col, id) do update set data = excluded.data, updated_at = excluded.updated_at;
  get diagnostics n = row_count;
  insert into public.ver(col, v)
  select distinct c, agora from (select e->>'col' as c from jsonb_array_elements(d) e union select col from public.ver) x
  on conflict (col) do update set v = excluded.v;
  return json_build_object('restaurados', n);
end $$;

revoke execute on function public.fazer_backup() from public, anon, authenticated;
revoke execute on function public.restaurar_backup(bigint) from public, anon, authenticated;
grant execute on function public.fazer_backup() to service_role;
grant execute on function public.restaurar_backup(bigint) to service_role;

-- Já faz a primeira cópia agora.
select public.fazer_backup();
