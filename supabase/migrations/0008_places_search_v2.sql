-- Place search, round two. People write "toit indiranagar" or "ctr malleshwaram":
-- a short name plus an area. Find the area words, score the name and the area
-- separately, and show the broad area while also searching the local one.

-- The local neighbourhood ("D'Souza Layout"); `area` holds the broad one ("Ashok Nagar").
alter table public.places add column if not exists near text not null default '';

-- Every area name we know, to spot the area part of a query.
create table if not exists public.place_areas (name text primary key);
alter table public.place_areas enable row level security;
drop policy if exists "Areas are public" on public.place_areas;
create policy "Areas are public" on public.place_areas for select using (true);
create index if not exists place_areas_trgm on public.place_areas using gin (lower(name) extensions.gin_trgm_ops);

create index if not exists places_name_trgm on public.places using gin (lower(name) extensions.gin_trgm_ops);

drop function if exists public.search_places(text, double precision, double precision, int);
create or replace function public.search_places(
	q text,
	near_lat double precision default 12.9716,
	near_lng double precision default 77.5946,
	max_results int default 8,
	-- When the caller already knows the area (a parsed list), skip guessing it.
	area_hint text default null
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
	with input as (
		select lower(trim(q)) as q, nullif(lower(trim(coalesce(area_hint, ''))), '') as hint
	),
	-- The area named in the query, if any: the longest area name that's (nearly) in it.
	guessed as (
		select coalesce(
			(select hint from input),
			(select lower(a.name) from public.place_areas a, input
				where input.hint is null and length(input.q) > 4
					and (
						-- "malleshwaram" ≈ Malleswaram: spelling variants count.
						(lower(a.name) <% input.q and word_similarity(lower(a.name), input.q) >= 0.7)
						-- "hsr" → HSR Layout: the area's first word typed on its own.
						or (
							length(split_part(lower(a.name), ' ', 1)) >= 3
							and split_part(lower(a.name), ' ', 1) = any(string_to_array(input.q, ' '))
							and split_part(lower(a.name), ' ', 1) not in
								('new', 'old', 'block', 'stage', 'phase', 'sector', 'main', 'cross', 'the', 'sri', 'shri')
						)
					)
				order by word_similarity(lower(a.name), input.q) desc, length(a.name) desc
				limit 1)
		) as area
	),
	parts as (
		select
			input.q,
			guessed.area,
			-- The query without the words that belong to the area.
			coalesce(
				nullif(trim((
					select string_agg(w, ' ')
					from unnest(string_to_array(input.q, ' ')) w
					where guessed.area is null or (input.hint is not null)
						or word_similarity(w, guessed.area) < 0.6
				)), ''),
				input.q
			) as name_q
		from input, guessed
	),
	hits as (
		select
			p.*,
			parts.area as want_area,
			greatest(
				word_similarity(parts.name_q, lower(p.name)),
				case when p.alias = split_part(parts.name_q, ' ', 1) then 0.95 end
			) as name_score,
			case when parts.area is null then null
				else word_similarity(parts.area, lower(p.area || ' ' || p.near)) end as area_score,
			similarity(parts.name_q, lower(p.name)) as tight
		from public.places p, parts
		where parts.name_q <% lower(p.name)
			or (p.alias is not null and p.alias = split_part(parts.name_q, ' ', 1))
	),
	scored as (
		select *,
			(case when area_score is null then name_score
				else 0.7 * name_score + 0.3 * area_score end
				-- Prefer an exact name, and well-sourced rows over junk, only slightly.
				+ 0.05 * tight + 0.05 * confidence)::real as score
		from hits
	)
	select id, name, area, lat, lng, category, kind, score
	from scored
	-- Equal matches (branches of a chain) come nearest first.
	order by round(score::numeric, 1) desc,
		power(lat - near_lat, 2) + power((lng - near_lng) * 0.97, 2)
	limit max_results;
$$;
