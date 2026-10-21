-- Our own index of Bangalore food places, loaded from Overture Maps Places (open data,
-- CDLA Permissive 2.0) by scripts/overture-places.mjs + scripts/load-places.mjs.
-- Searched in Postgres so search is typo-tolerant, fast and doesn't depend on Photon.
create table if not exists public.places (
	id text primary key,
	name text not null,
	area text not null default '',
	lat double precision not null,
	lng double precision not null,
	category text,
	kind text,
	-- Initials for long names, so "CTR" finds Central Tiffin Room.
	alias text,
	confidence real not null default 0.5,
	updated_at timestamptz not null default now()
);

alter table public.places enable row level security;
drop policy if exists "Places are public" on public.places;
create policy "Places are public" on public.places for select using (true);

create index if not exists places_search_trgm
	on public.places using gin (lower(name || ' ' || area) extensions.gin_trgm_ops);
create index if not exists places_alias on public.places (alias) where alias is not null;

create or replace function public.search_places(
	q text,
	near_lat double precision default 12.9716,
	near_lng double precision default 77.5946,
	max_results int default 8
)
returns table (
	id text,
	name text,
	area text,
	lat double precision,
	lng double precision,
	category text,
	kind text,
	score real
)
language sql
stable
set search_path = public, extensions
as $$
	with query as (
		select
			lower(trim(q)) as q,
			split_part(lower(trim(q)), ' ', 1) as first,
			trim(substr(lower(trim(q)), length(split_part(lower(trim(q)), ' ', 1)) + 1)) as rest
	),
	hits as (
		select
			p.*,
			greatest(
				-- "meghana koramangala" vs "Meghana Foods Koramangala": the area counts too.
				word_similarity(query.q, lower(p.name || ' ' || p.area)),
				case when p.alias = query.first then
					case when query.rest = '' then 0.9
					else 0.8 + 0.2 * word_similarity(query.rest, lower(p.area)) end
				end
			)::real as score
		from public.places p, query
		where query.q <% lower(p.name || ' ' || p.area)
			or (p.alias is not null and p.alias = query.first)
	)
	select id, name, area, lat, lng, category, kind, score
	from hits
	-- Equal matches (branches of a chain) come nearest first.
	order by round(score::numeric, 1) desc,
		power(lat - near_lat, 2) + power((lng - near_lng) * 0.97, 2)
	limit max_results;
$$;

-- Known places: score against name and area together, so the area someone wrote counts.
create or replace function public.search_known_places(
	q text,
	near_lat double precision default 12.9716,
	near_lng double precision default 77.5946,
	max_results int default 6
)
returns table (
	name text,
	area text,
	lat double precision,
	lng double precision,
	category text,
	osm_id text,
	pinned_by int,
	score real
)
language sql
stable
set search_path = public, extensions
as $$
	with matches as (
		select
			s.name, s.area, s.lat, s.lng, s.category, s.osm_id, s.owner_id,
			word_similarity(lower(q), lower(s.name || ' ' || s.area)) as score
		from public.spots s
		where lower(q) <% lower(s.name || ' ' || s.area)
	)
	select
		min(name), min(area), avg(lat), avg(lng), min(category), min(osm_id),
		count(distinct owner_id)::int as pinned_by,
		max(score) as score
	from matches
	group by lower(name), round(lat::numeric, 3), round(lng::numeric, 3)
	order by
		round(max(score)::numeric, 1) desc,
		count(distinct owner_id) desc,
		power(avg(lat) - near_lat, 2) + power(avg(lng) - near_lng, 2)
	limit max_results;
$$;
