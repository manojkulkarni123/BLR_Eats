-- Daily caps for "Ask this map", so a viral day can't exhaust the free AI quota.
-- One row per day per key: '*' is the global total, otherwise a hashed visitor.
create table public.ai_usage (
	day date not null default current_date,
	key text not null,
	count integer not null default 0,
	primary key (day, key)
);
alter table public.ai_usage enable row level security;
-- No policies: only take_ai_ask() below touches it.

create or replace function public.take_ai_ask(p_key text, p_per_key int, p_global int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
	used_global int;
	used_key int;
begin
	select count into used_global from public.ai_usage where day = current_date and key = '*';
	select count into used_key from public.ai_usage where day = current_date and key = p_key;
	if coalesce(used_global, 0) >= p_global or coalesce(used_key, 0) >= p_per_key then
		return false;
	end if;
	insert into public.ai_usage (day, key, count) values (current_date, '*', 1), (current_date, p_key, 1)
	on conflict (day, key) do update set count = public.ai_usage.count + 1;
	return true;
end;
$$;
revoke execute on function public.take_ai_ask(text, int, int) from public;
grant execute on function public.take_ai_ask(text, int, int) to anon, authenticated;
