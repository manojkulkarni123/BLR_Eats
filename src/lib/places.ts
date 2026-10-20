import type { CategoryKey } from './categories.ts';

// Place search on OpenStreetMap data (Photon): free, no API key, Bangalore only.
const BANGALORE_BBOX = '77.35,12.75,77.85,13.25';

export type Place = {
	name: string;
	lat: number;
	lng: number;
	area: string;
	osmId: string;
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
		cuisine?: string;
	};
};

// OSM tags that hint at a category, so the right chip is already picked.
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
			return 'desserts';
		default:
			return null;
	}
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
	const q = query.trim();
	if (q.length < 2) return [];
	const url = new URL('https://photon.komoot.io/api/');
	url.searchParams.set('q', q);
	url.searchParams.set('limit', '8');
	url.searchParams.set('lang', 'en');
	url.searchParams.set('bbox', BANGALORE_BBOX);
	url.searchParams.set('lat', '12.9716');
	url.searchParams.set('lon', '77.5946');

	const res = await fetch(url, { signal });
	if (!res.ok) return [];
	const { features } = (await res.json()) as { features: PhotonFeature[] };

	// Photon can return the same OSM object more than once; keep the first.
	const seen = new Set<string>();
	return features
		.filter((f) => {
			const id = `${f.properties.osm_type}${f.properties.osm_id}`;
			if (!f.properties.name || seen.has(id)) return false;
			seen.add(id);
			return true;
		})
		.map((f) => {
			const p = f.properties;
			const name = p.name!;
			return {
				name,
				lng: f.geometry.coordinates[0],
				lat: f.geometry.coordinates[1],
				area: p.suburb ?? p.locality ?? p.district ?? p.street ?? p.city ?? '',
				osmId: `${p.osm_type}${p.osm_id}`,
				suggestedCategory: suggest(p.osm_value, name)
			};
		});
}
