-- View counts: one row per map per day. Anyone can record a view through
-- record_view(); only the owner can read their numbers.
create table public.map_views (
	profile_id uuid not null references public.profiles (id) on delete cascade,
	day date not null default current_date,
	views integer not null default 0,
	primary key (profile_id, day)
);
alter table public.map_views enable row level security;
create policy "owner read" on public.map_views for select using ((select auth.uid()) = profile_id);

-- Callable by anyone on purpose (viewers aren't signed in): it can only add one
-- view to a map that exists.
create or replace function public.record_view(p_handle text)
returns void
language sql
security definer
set search_path = ''
as $$
	insert into public.map_views (profile_id, day, views)
	select p.id, current_date, 1
	from public.profiles p
	where p.handle = p_handle::extensions.citext
		-- The owner looking at their own map doesn't count.
		and p.id is distinct from (select auth.uid())
	on conflict (profile_id, day) do update set views = public.map_views.views + 1;
$$;
revoke execute on function public.record_view(text) from public;
grant execute on function public.record_view(text) to anon, authenticated;

-- Named lists ("Date night", "Under ₹300"): hand-picked spots, shareable like a slice.
create table public.lists (
	id uuid primary key default gen_random_uuid(),
	owner_id uuid not null references public.profiles (id) on delete cascade,
	name text not null check (char_length(name) between 1 and 30),
	slug text not null,
	emoji text not null default '⭐',
	created_at timestamptz not null default now(),
	unique (owner_id, slug)
);
create unique index lists_owner_name on public.lists (owner_id, lower(name));

create table public.list_spots (
	list_id uuid not null references public.lists (id) on delete cascade,
	spot_id uuid not null references public.spots (id) on delete cascade,
	owner_id uuid not null references public.profiles (id) on delete cascade,
	created_at timestamptz not null default now(),
	primary key (list_id, spot_id)
);
create index list_spots_spot on public.list_spots (spot_id);
create index list_spots_owner on public.list_spots (owner_id);

alter table public.lists enable row level security;
alter table public.list_spots enable row level security;

create policy "public read" on public.lists for select using (true);
create policy "owner write" on public.lists for all
	using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

create policy "public read" on public.list_spots for select using (true);
create policy "owner write" on public.list_spots for all
	using ((select auth.uid()) = owner_id)
	with check (
		(select auth.uid()) = owner_id
		and exists (select 1 from public.lists l where l.id = list_id and l.owner_id = (select auth.uid()))
		and exists (select 1 from public.spots s where s.id = spot_id and s.owner_id = (select auth.uid()))
	);
