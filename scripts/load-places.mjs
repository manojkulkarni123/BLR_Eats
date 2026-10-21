// Step 2 of refreshing the place index: tidy the Overture extract (area names, our
// categories, initials like "CTR") and upsert it into public.places. Places that
// dropped out of the new release are removed.
// Usage: node --env-file=.env scripts/load-places.mjs <overture-blr.json>
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const file = process.argv[2] ?? 'overture-blr.json';
const { release, places, areas } = JSON.parse(readFileSync(file, 'utf8'));
const db = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
	auth: { persistSession: false }
});

// Low-confidence rows are mostly duplicates and junk.
const MIN_CONFIDENCE = 0.35;

const km = (a, b) => {
	const dLat = (a.lat - b.lat) * 111;
	const dLng = (a.lng - b.lng) * 111 * Math.cos((a.lat * Math.PI) / 180);
	return Math.hypot(dLat, dLng);
};

// "Koramangala 5th Block" → "Koramangala", "Indiranagar 2nd Stage" → "Indiranagar".
const tidyArea = (name) =>
	name.replace(/\s+\d+(st|nd|rd|th)?\s+(block|stage|phase|sector|cross|main)\b.*$/i, '').trim();

// A coarse grid so the nearest-area lookup isn't 18k × 1.5k distance checks.
const grid = new Map();
const cell = (lat, lng) => `${Math.floor(lat * 50)}:${Math.floor(lng * 50)}`;
for (const a of areas) {
	const k = cell(a.lat, a.lng);
	grid.set(k, [...(grid.get(k) ?? []), a]);
}
function nearest(p, subtype, maxKm) {
	const [ci, cj] = cell(p.lat, p.lng).split(':').map(Number);
	let best = null;
	let bestKm = maxKm;
	for (let i = -2; i <= 2; i++)
		for (let j = -2; j <= 2; j++)
			for (const a of grid.get(`${ci + i}:${cj + j}`) ?? []) {
				if (a.subtype !== subtype) continue;
				const d = km(p, a);
				if (d < bestKm) [best, bestKm] = [a, d];
			}
	return best ? tidyArea(best.name) : '';
}
// Show the broad area people say ("Malleswaram"); also search the local one.
function areaFor(p) {
	const local = nearest(p, 'neighborhood', 1.5);
	return { area: nearest(p, 'macrohood', 2.5) || local, near: local };
}

// Overture's taxonomy (and the name) → our fixed categories (src/lib/categories.ts).
function category(kind, name) {
	const n = name.toLowerCase();
	const k = kind ?? '';
	if (/biryani/.test(n)) return 'biryani';
	if (/pizza/.test(n) || k === 'pizza_restaurant') return 'pizza';
	if (/burger/.test(n) || k === 'burger_restaurant') return 'burgers';
	if (/momo|dim ?sum/.test(n) || /chinese|dim_sum|dumpling/.test(k)) return 'chinese';
	if (/ramen|sushi|noodle/.test(n) || /japanese|thai|korean|sushi|vietnamese|asian/.test(k))
		return 'asian';
	if (/italian|pasta/.test(n) || k === 'italian_restaurant') return 'italian';
	if (/chaat|pani ?puri|chat corner/.test(n) || /food_truck|street_vendor/.test(k))
		return 'street-food';
	if (/dosa|idli|darshini|udupi|tiffin|sagar|bhavan|bhavan|thindi|military hotel/.test(n))
		return 'south-indian';
	if (/punjabi|dhaba|north indian|mughlai/.test(n) || /punjabi|mughlai|pakistani/.test(k))
		return 'north-indian';
	if (
		/^(bar|pub|brewery|lounge|gastropub|cocktail_bar|beer_bar|sports_bar|hookah_bar|winery|distillery|bar_and_grill_restaurant|wine_bar)$/.test(
			k
		) ||
		/brew|taproom/.test(n)
	)
		return 'bars';
	if (/^(cafe|coffee_shop|tea_room|bubble_tea_shop)$/.test(k)) return 'cafes';
	if (
		/bakery|dessert|ice_cream|candy|chocolat|cupcake|donut|gelato|frozen_yogurt|patisserie/.test(k)
	)
		return 'desserts';
	return null;
}

// Initials for names of 3+ words, so "CTR" finds Central Tiffin Room.
const STOP = new Set(['the', 'and', 'of', '&', '-', 'a']);
function alias(name) {
	const words = name
		.toLowerCase()
		.replace(/[^a-z0-9& ]/g, ' ')
		.split(/\s+/)
		.filter(Boolean);
	const keep = words.filter((w) => !STOP.has(w));
	return keep.length >= 3 ? keep.map((w) => w[0]).join('') : null;
}

const started = new Date().toISOString();
const rows = places
	.filter((p) => p.confidence >= MIN_CONFIDENCE && p.name.trim())
	.map((p) => ({
		id: p.id,
		name: p.name.trim().slice(0, 120),
		...areaFor(p),
		lat: p.lat,
		lng: p.lng,
		category: category(p.kind, p.name),
		kind: p.kind,
		address: (p.address ?? '').trim().slice(0, 160),
		alias: alias(p.name),
		confidence: Math.round(p.confidence * 100) / 100,
		updated_at: started
	}));

for (let i = 0; i < rows.length; i += 1000) {
	const { error } = await db.from('places').upsert(rows.slice(i, i + 1000));
	if (error) throw new Error(error.message);
	process.stdout.write(`\r${Math.min(i + 1000, rows.length)}/${rows.length}`);
}
const areaNames = [...new Set(areas.map((a) => tidyArea(a.name)).filter((n) => n.length >= 3))];
for (let i = 0; i < areaNames.length; i += 1000) {
	const batch = areaNames.slice(i, i + 1000).map((name) => ({ name }));
	const { error } = await db.from('place_areas').upsert(batch);
	if (error) throw new Error(error.message);
}
const { count } = await db.from('places').delete({ count: 'exact' }).lt('updated_at', started);

const withArea = rows.filter((r) => r.area).length;
const withCategory = rows.filter((r) => r.category).length;
console.log(
	`\nloaded ${rows.length} places from Overture ${release} (${withArea} with an area, ${withCategory} with a category); removed ${count ?? 0} stale`
);
