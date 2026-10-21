-- Typo-tolerant search over every place already pinned on any blr_eats map.
-- Trigram matching ("meghna" ~ "Meghana") is how most search products handle typos.
create extension if not exists pg_trgm with schema extensions;

create index if not exists spots_name_trgm
	on public.spots using gin (lower(name || ' ' || area) extensions.gin_trgm_ops);

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
			greatest(
				word_similarity(lower(q), lower(s.name)),
				similarity(lower(q), lower(s.name || ' ' || s.area))
			) as score
		from public.spots s
		where lower(q) <% lower(s.name || ' ' || s.area)
	)
	-- The same place pinned on several maps shows once; more pins rank higher, then nearer.
	select
		min(name), min(area), avg(lat), avg(lng), min(category), min(osm_id),
		count(distinct owner_id)::int as pinned_by,
		max(score) as score
	from matches
	group by lower(name), round(lat::numeric, 3), round(lng::numeric, 3)
	order by
		max(score) desc,
		count(distinct owner_id) desc,
		power(avg(lat) - near_lat, 2) + power(avg(lng) - near_lng, 2)
	limit max_results;
$$;
