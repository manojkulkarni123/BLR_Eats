import type { CategoryKey } from './categories.ts';

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
function suggest(value: string, name: string): CategoryKey | null {
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
	const res = await fetch(url, { signal });
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
