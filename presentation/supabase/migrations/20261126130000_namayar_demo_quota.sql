create table public.namayar_demo_quota (
  day date primary key,
  requests integer not null
);
alter table public.namayar_demo_quota enable row level security;
revoke all on public.namayar_demo_quota from public, anon, authenticated;
grant select, insert, update on public.namayar_demo_quota to service_role;

create function public.namayar_demo_remaining(consume boolean)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  today date := (now() at time zone 'UTC')::date;
  used integer;
begin
  if consume then
    insert into public.namayar_demo_quota as quota (day, requests)
    values (today, 1)
    on conflict (day) do update set requests = quota.requests + 1
    where quota.requests < 100
    returning requests into used;
    return case when used is null then -1 else 100 - used end;
  end if;

  select requests into used from public.namayar_demo_quota where day = today;
  return 100 - coalesce(used, 0);
end;
$$;
revoke all on function public.namayar_demo_remaining(boolean) from public, anon, authenticated;
grant execute on function public.namayar_demo_remaining(boolean) to service_role;
