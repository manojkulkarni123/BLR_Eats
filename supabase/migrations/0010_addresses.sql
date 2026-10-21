-- Street addresses: shown in place search to tell branches apart, and saved on each
-- spot so the spot card can say "32, Gandhi Bazaar Main Rd · Basavanagudi".
alter table public.spots
	add column if not exists address text not null default ''
	check (char_length(address) <= 200);

-- Both search functions now return the address (a new return type, so drop first).
drop function if exists public.search_places(text, double precision, double precision, int, text);
drop function if exists public.search_known_places(text, double precision, double precision, int);

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
	address text,
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
						-- "malleshwaram" ≈ Malleswaram, "jaynagar" ≈ Jayanagar: spelling variants
						-- of longer names count (they score 0.55–0.7); short ones must be near exact.
						-- (About 1,500 area names, so scoring each directly is cheap.)
						word_similarity(lower(a.name), input.q) >= case when length(a.name) >= 8 then 0.55 else 0.8 end
						-- "hsr" → HSR Layout: the first word of an "X Layout" / "X Nagar" name on its own
						-- (not "Coffee Board Layout", whose first word is just a word).
						or (
							array_length(string_to_array(lower(a.name), ' '), 1) = 2
							and split_part(lower(a.name), ' ', 2) in
								('layout', 'nagar', 'town', 'colony', 'extension', 'road', 'puram')
							and length(split_part(lower(a.name), ' ', 1)) >= 3
							and split_part(lower(a.name), ' ', 1) = any(string_to_array(input.q, ' '))
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
						or word_similarity(w, guessed.area) < 0.45
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
				-- "brahmins" should match "Brahmin's" fully.
				word_similarity(parts.name_q, regexp_replace(lower(p.name), '[''’]', '', 'g')),
				case when p.alias = split_part(parts.name_q, ' ', 1) then 0.95 end
			) as name_score,
			-- Where it is: the area, the neighbourhood, the street address, and the name
			-- itself ("Truffles St. Marks", "Empire, 36 Church St", "MTR, Lalbagh Rd").
			case when parts.area is null then null
				else word_similarity(
					parts.area,
					lower(p.area || ' ' || p.near || ' ' || p.address || ' ' || p.name)
				) end as area_score,
			similarity(parts.name_q, regexp_replace(lower(p.name), '[''’]', '', 'g')) as tight
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
	select id, name, area, lat, lng, category, kind, address, score
	from scored
	-- Equal matches (branches of a chain): the one in the named area, then the nearest.
	order by round(score::numeric, 1) desc,
		area_score desc nulls last,
		power(lat - near_lat, 2) + power((lng - near_lng) * 0.97, 2)
	limit max_results;
$$;

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
	address text,
	score real
)
language sql
stable
set search_path = public, extensions
as $$
	with matches as (
		select
			s.name, s.area, s.lat, s.lng, s.category, s.osm_id, s.owner_id, s.address,
			word_similarity(lower(q), lower(s.name || ' ' || s.area)) as score
		from public.spots s
		where lower(q) <% lower(s.name || ' ' || s.area)
	)
	select
		min(name), min(area), avg(lat), avg(lng), min(category), min(osm_id),
		count(distinct owner_id)::int as pinned_by,
		max(address),
		max(score) as score
	from matches
	group by lower(name), round(lat::numeric, 3), round(lng::numeric, 3)
	order by
		round(max(score)::numeric, 1) desc,
		count(distinct owner_id) desc,
		power(avg(lat) - near_lat, 2) + power(avg(lng) - near_lng, 2)
	limit max_results;
$$;
