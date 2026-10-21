import type { SupabaseClient } from '@supabase/supabase-js';
import { CATEGORIES, type CategoryKey } from '#lib/categories.ts';
import { findPlaces, suggest, type Place } from '#lib/places.ts';
import { aiJson, aiReadImages } from './ai.ts';
import { MAPS_LINK, placeFromMapsLink } from './google-maps.ts';

// "Turn your list into a map": the WhatsApp list or Notes page people already have
// becomes pins. The AI only reads the text; every place is then matched against real
// data (places already on blr_eats maps first, then OpenStreetMap), never invented.

export const MAX_LIST_CHARS = 4000;
const MAX_ITEMS = 40;

export type ParsedItem = {
	/** What the person wrote, so they can see what each match came from. */
	wrote: string;
	tip: string;
	category: CategoryKey | null;
	/** Best guess, then other candidates (other branches, similar names). */
	match: Place | null;
	alternatives: Place[];
};

type Extracted = {
	name?: unknown;
	area?: unknown;
	tip?: unknown;
	category?: unknown;
	link?: unknown;
};

const KEYS = CATEGORIES.map((c) => c.key) as string[];

const SYSTEM = `You turn someone's list of favourite Bangalore food places into JSON.
Reply only with {"places":[{"name":"","area":"","tip":"","category":"","link":0}]}.
- name: the place's name only, spelled as written (fix obvious typos). No dishes, no area.
- area: the Bangalore neighbourhood or road if the text gives one, else "".
The text may be typed, copied from screenshots, or spoken and turned into text, so names can
be misheard ("Magna Foods" for Meghana Foods, "Tuit" for Toit, "Kora Mangala" for Koramangala,
"Baisavanagudi" for Basavanagudi). When you're confident which well-known Bangalore place or
area was meant, write its usual spelling; otherwise keep it as written.
- tip: what they say to order or know, in their own words, under 140 characters, else "".
- category: one of ${KEYS.join(', ')}, or "" if unsure.
- link: if a place comes with a [link N] marker, N; else 0.
Skip anything that isn't a place to eat or drink. At most ${MAX_ITEMS} places, in the order given.`;

/** Run async work over items with a few at a time, so Photon isn't flooded. */
async function pool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
	const out: R[] = new Array(items.length);
	let next = 0;
	const worker = async () => {
		while (next < items.length) {
			const i = next++;
			out[i] = await fn(items[i]);
		}
	};
	await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker));
	return out;
}

async function match(
	db: SupabaseClient,
	name: string,
	area: string
): Promise<{ match: Place | null; alternatives: Place[] }> {
	// Our own sources first; Photon only when they find nothing good.
	let all = await findPlaces(db, name, { area: area || undefined, photon: 'fallback' });
	// "Meghana, Indiranagr": a misspelt area shouldn't lose the place.
	if (!all.length && area) all = await findPlaces(db, name, { photon: 'fallback' });
	return { match: all[0] ?? null, alternatives: all.slice(1, 4) };
}

/** Loose name check: does "Vidyarthi bhavan" plausibly name "Vidyarthi Bhavan"? */
function sameName(a: string, b: string) {
	const words = (s: string) =>
		new Set(
			s
				.toLowerCase()
				.replace(/[^a-z0-9 ]/g, ' ')
				.split(/\s+/)
				.filter((w) => w.length >= 3)
		);
	const x = words(a);
	return [...words(b)].some((w) => x.has(w)) || a.toLowerCase().includes(b.toLowerCase());
}

export const MAX_SCREENSHOTS = 5;

const READ_SCREENSHOTS = `These are screenshots of food recommendations in Bangalore: Zomato or Swiggy pages, Instagram posts, stories or reels, chats, Google Maps, or menus.
Write out every restaurant, café, bar, bakery or food place named in them, one per line, as:
name, area or road (if shown) – what to order or any tip shown
Copy names exactly as shown. Skip dishes, people, brands of packaged food and anything that isn't a place to eat or drink. Don't guess places that aren't shown. If there are none, reply NONE.`;

/** Screenshots → lines of text in the same shape people type ("CTR, Malleshwaram – benne dosa"). */
export async function readScreenshots(images: string[]): Promise<string> {
	if (!images.length) return '';
	const text = await aiReadImages(READ_SCREENSHOTS, images.slice(0, MAX_SCREENSHOTS));
	return /^\s*none\s*$/i.test(text) ? '' : text;
}

export async function parseList(db: SupabaseClient, text: string): Promise<ParsedItem[]> {
	// Swap links for short markers: the AI never needs to read or copy a URL.
	const links: string[] = [];
	const marked = text.slice(0, MAX_LIST_CHARS).replace(MAPS_LINK, (url) => {
		links.push(url);
		return `[link ${links.length}]`;
	});
	const linked = await Promise.all(links.map((l) => placeFromMapsLink(l).catch(() => null)));

	// A paste of only links needs no AI at all.
	const words = marked.replace(/\[link \d+\]/g, '').replace(/[^\p{L}]/gu, '');
	const raw =
		words.length >= 3
			? ((await aiJson<{ places?: Extracted[] }>(SYSTEM, marked, 3000)).places ?? [])
			: [];

	const used = new Set<number>();
	const items = await pool(raw.slice(0, MAX_ITEMS), 4, async (e): Promise<ParsedItem | null> => {
		const name = String(e.name ?? '')
			.trim()
			.slice(0, 80);
		if (!name) return null;
		const area = String(e.area ?? '')
			.trim()
			.slice(0, 60);
		const tip = String(e.tip ?? '')
			.trim()
			.slice(0, 280);
		const category = KEYS.includes(String(e.category)) ? (e.category as CategoryKey) : null;
		const n = Number(e.link);
		const candidate = n >= 1 && n <= links.length ? linked[n - 1] : null;
		const fromLink = candidate && sameName(candidate.name, name) ? candidate : null;
		if (fromLink) used.add(n - 1);
		const found = fromLink ? { match: fromLink, alternatives: [] } : await match(db, name, area);
		return {
			wrote: area ? `${name}, ${area}` : name,
			tip,
			category: category ?? found.match?.suggestedCategory ?? suggest('', name),
			...found
		};
	});

	// Links the AI didn't tie to a named place still become spots (or a "couldn't read" row),
	// unless the list already names that place.
	const named = items.filter((i): i is ParsedItem => i !== null);
	const loose = linked.flatMap((p, i): ParsedItem[] =>
		used.has(i) || (p && named.some((it) => sameName(it.wrote, p.name)))
			? []
			: [
					{
						wrote: p?.name ?? 'A Google Maps link',
						tip: '',
						category: p?.suggestedCategory ?? null,
						match: p,
						alternatives: []
					}
				]
	);
	return [...named, ...loose].slice(0, MAX_ITEMS);
}
