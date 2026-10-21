import type { SupabaseClient } from '@supabase/supabase-js';
import { CATEGORIES, type CategoryKey } from './categories.ts';

// Place search on OpenStreetMap data (Photon): free, no API key, Bangalore only.
const BANGALORE_BBOX = '77.35,12.75,77.85,13.25';
const CITY_CENTRE = { lat: 12.9716, lng: 77.5946 };

// Places people eat at. Searched first so food ranks above roads and shops with the same name.
const FOOD_TAGS = [
	'amenity:restaurant',
	'amenity:cafe',
	'amenity:fast_food',
	'amenity:bar',
	'amenity:pub',
	'amenity:biergarten',
	'amenity:ice_cream',
	'amenity:food_court',
	'shop:bakery',
	'shop:confectionery',
	'shop:pastry'
];

export type Place = {
	name: string;
	lat: number;
	lng: number;
	area: string;
	/** Street, to tell branches of the same chain apart. */
	street: string;
	osmId: string;
	isFood: boolean;
	suggestedCategory: CategoryKey | null;
	/** How many blr_eats maps already have this place (known-place results only). */
	pinnedBy?: number;
	/** How well it matched the query, 0–1 (our own index and known places only). */
	score?: number;
};

type PhotonFeature = {
	geometry: { coordinates: [number, number] };
	properties: {
		osm_type: string;
		osm_id: number;
		osm_key: string;
		osm_value: string;
		name?: string;
		street?: string;
		locality?: string;
		district?: string;
		suburb?: string;
		city?: string;
	};
};

// OSM tags and names that hint at a category, so the right chip is already picked.
// Pass an empty value to guess from the name alone.
export function suggest(value: string, name: string): CategoryKey | null {
	const n = name.toLowerCase();
	if (/biryani/.test(n)) return 'biryani';
	if (/pizza/.test(n)) return 'pizza';
	if (/burger/.test(n)) return 'burgers';
	if (/ramen|noodle|sushi|thai|korean|japanese/.test(n)) return 'asian';
	if (/dim ?sum|momo|chinese/.test(n)) return 'chinese';
	if (/dosa|idli|darshini|udupi|sagar|bhavan/.test(n)) return 'south-indian';
	if (/brew|pub|taproom/.test(n)) return 'bars';
	if (/chaat|pani ?puri/.test(n)) return 'street-food';
	switch (value) {
		case 'cafe':
			return 'cafes';
		case 'bar':
		case 'pub':
		case 'biergarten':
			return 'bars';
		case 'ice_cream':
		case 'bakery':
		case 'confectionery':
		case 'pastry':
			return 'desserts';
		default:
			return null;
	}
}

function toPlace(f: PhotonFeature): Place {
	const p = f.properties;
	const name = p.name!;
	return {
		name,
		lng: f.geometry.coordinates[0],
		lat: f.geometry.coordinates[1],
		area: p.suburb ?? p.locality ?? p.district ?? p.city ?? '',
		street: p.street ?? '',
		osmId: `${p.osm_type}${p.osm_id}`,
		isFood: FOOD_TAGS.includes(`${p.osm_key}:${p.osm_value}`),
		suggestedCategory: suggest(p.osm_value, name)
	};
}

async function photon(
	path: 'api' | 'reverse',
	params: Record<string, string | string[]>,
	signal?: AbortSignal
): Promise<PhotonFeature[]> {
	const url = new URL(`https://photon.komoot.io/${path}/`);
	for (const [k, v] of Object.entries(params)) {
		for (const value of [v].flat()) url.searchParams.append(k, value);
	}
	const timeout = AbortSignal.timeout(3000);
	const res = await fetch(url, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
	if (!res.ok) return [];
	return ((await res.json()) as { features: PhotonFeature[] }).features;
}

/**
 * Search Bangalore places, food first. Results near `near` (the map's current view)
 * rank higher, so the nearby branch of a chain comes up first.
 */
export async function searchPlaces(
	query: string,
	near: { lat: number; lng: number } = CITY_CENTRE,
	signal?: AbortSignal
): Promise<Place[]> {
	const q = query.trim();
	if (q.length < 2) return [];
	const common = {
		q,
		lang: 'en',
		bbox: BANGALORE_BBOX,
		lat: String(near.lat),
		lon: String(near.lng)
	};
	const [food, any] = await Promise.all([
		photon('api', { ...common, limit: '8', osm_tag: FOOD_TAGS }, signal),
		photon('api', { ...common, limit: '5' }, signal)
	]);

	// Photon can return the same OSM object more than once; keep the first.
	const seen = new Set<string>();
	return [...food, ...any]
		.filter((f) => {
			const id = `${f.properties.osm_type}${f.properties.osm_id}`;
			if (!f.properties.name || seen.has(id)) return false;
			seen.add(id);
			return true;
		})
		.map(toPlace)
		.slice(0, 10);
}

/** The area name for a point, used when someone drops a pin by hand. */
export async function areaAt(lat: number, lng: number): Promise<string> {
	try {
		const [f] = await photon('reverse', { lat: String(lat), lon: String(lng), lang: 'en' });
		const p = f?.properties;
		return p?.suburb ?? p?.locality ?? p?.district ?? p?.street ?? '';
	} catch {
		return '';
	}
}

/** Metres between two points (haversine). */
export function distanceM(
	a: { lat: number; lng: number },
	b: { lat: number; lng: number }
): number {
	const rad = Math.PI / 180;
	const dLat = (b.lat - a.lat) * rad;
	const dLng = (b.lng - a.lng) * rad;
	const h =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
	return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

/** Food places within a few hundred metres, nearest first: "I'm eating here right now". */
export async function foodNear(
	at: { lat: number; lng: number },
	signal?: AbortSignal
): Promise<Place[]> {
	const features = await photon(
		'reverse',
		{
			lat: String(at.lat),
			lon: String(at.lng),
			limit: '12',
			radius: '0.3',
			lang: 'en',
			osm_tag: FOOD_TAGS
		},
		signal
	);
	return features
		.filter((f) => f.properties.name)
		.map(toPlace)
		.sort((a, b) => distanceM(at, a) - distanceM(at, b));
}

/** An id for places that aren't from OpenStreetMap. Saved as no OSM id. */
export const localId = (lat: number, lng: number) => `x:${lat.toFixed(5)},${lng.toFixed(5)}`;

type Known = {
	name: string;
	area: string;
	lat: number;
	lng: number;
	category: string | null;
	osm_id: string | null;
	pinned_by: number;
	score: number;
};
const KEYS: string[] = CATEGORIES.map((c) => c.key);

/**
 * Places already pinned on any blr_eats map, typo-tolerant ("meghna" finds Meghana):
 * trigram matching in Postgres (search_known_places), same place on several maps shown once.
 */
export async function searchKnown(
	db: SupabaseClient,
	query: string,
	near: { lat: number; lng: number } = CITY_CENTRE,
	max = 4
): Promise<Place[]> {
	const q = query.trim();
	if (q.length < 3) return [];
	const { data } = await db.rpc('search_known_places', {
		q,
		near_lat: near.lat,
		near_lng: near.lng,
		max_results: max
	});
	return ((data ?? []) as Known[])
		.filter((k) => k.score >= 0.5)
		.map((k) => ({
			score: k.score,
			name: k.name,
			lat: k.lat,
			lng: k.lng,
			area: k.area,
			street: '',
			osmId: k.osm_id ?? localId(k.lat, k.lng),
			isFood: true,
			suggestedCategory: KEYS.includes(k.category ?? '') ? (k.category as CategoryKey) : null,
			pinnedBy: k.pinned_by
		}));
}

type Indexed = {
	id: string;
	name: string;
	area: string;
	lat: number;
	lng: number;
	category: string | null;
	kind: string | null;
	score: number;
};

/**
 * Our own index of Bangalore food places (public.places, loaded from Overture Maps).
 * Typo-tolerant, knows initials ("CTR"), and spots the area in "toit indiranagar".
 */
export async function searchIndex(
	db: SupabaseClient,
	query: string,
	near: { lat: number; lng: number } = CITY_CENTRE,
	max = 8,
	areaHint?: string
): Promise<Place[]> {
	const q = query.trim();
	if (q.length < 2) return [];
	const { data } = await db.rpc('search_places', {
		q,
		near_lat: near.lat,
		near_lng: near.lng,
		max_results: max,
		...(areaHint ? { area_hint: areaHint } : {})
	});
	return ((data ?? []) as Indexed[])
		.filter((p) => p.score >= 0.5)
		.map((p) => ({
			name: p.name,
			lat: p.lat,
			lng: p.lng,
			area: p.area,
			street: '',
			// Not an OSM id, so it's saved as none (see localId).
			osmId: `x:${p.id}`,
			isFood: true,
			suggestedCategory: KEYS.includes(p.category ?? '')
				? (p.category as CategoryKey)
				: suggest('', p.name),
			score: p.score
		}));
}

/**
 * Every place source, best first: places on blr_eats maps and our own index (ranked
 * together by match), then OpenStreetMap via Photon for anything they miss.
 * `photon: 'fallback'` only asks Photon when our own sources found nothing good.
 */
export async function findPlaces(
	db: SupabaseClient,
	query: string,
	{
		near = CITY_CENTRE,
		area,
		signal,
		photon = 'always'
	}: {
		near?: { lat: number; lng: number };
		area?: string;
		signal?: AbortSignal;
		photon?: 'always' | 'fallback';
	} = {}
): Promise<Place[]> {
	const full = area ? `${query} ${area}` : query;
	const fromPhoton = () =>
		searchPlaces(full, near, signal).catch((e) => {
			if (e instanceof DOMException && e.name === 'AbortError' && signal?.aborted) throw e;
			return [] as Place[];
		});
	const osmEarly = photon === 'always' ? fromPhoton() : null;
	const [known, indexed] = await Promise.all([
		searchKnown(db, full, near).catch(() => []),
		searchIndex(db, query, near, 8, area).catch(() => [])
	]);
	// Someone already pinned it: a small boost over an equally good index match.
	const ours = [...known, ...indexed].sort(
		(a, b) => (b.score ?? 0) + (b.pinnedBy ? 0.05 : 0) - ((a.score ?? 0) + (a.pinnedBy ? 0.05 : 0))
	);
	const good = ours.some((p) => (p.score ?? 0) >= 0.7);
	const osm = osmEarly ? await osmEarly : good ? [] : await fromPhoton();
	return mergePlaces(
		ours,
		osm.filter((p) => !area || p.isFood)
	);
}

/** Known places first, then OSM ones that aren't the same place. */
export function mergePlaces(known: Place[], osm: Place[]): Place[] {
	const seen = new Set<string>();
	return [...known, ...osm].filter((p) => {
		const key = `${p.name.toLowerCase()}|${p.lat.toFixed(3)}|${p.lng.toFixed(3)}`;
		if (seen.has(key) || seen.has(p.osmId)) return false;
		seen.add(key);
		seen.add(p.osmId);
		return true;
	});
}
