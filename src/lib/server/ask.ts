import { aiEnabled, aiJson } from './ai.ts';
import { spotCategoryLabel } from '#lib/slices.ts';
import type { FoodMap } from '#lib/types.ts';

// "Ask this map": a visitor asks in their own words; the model picks spots from this
// map only, using the owner's own tips. It never sees anything but the map's public data.

export const askEnabled = aiEnabled;

export type AskAnswer = { reply: string; picks: { id: string; why: string }[] };

// The free tier allows about 8,000 tokens a minute across everyone, so each question
// sends only the spots most likely to matter (about 30 tokens each).
const MAX_SPOTS = 40;

// A few everyday words that point at categories, so "something sweet" finds Desserts.
const HINTS: Record<string, string> = {
	spicy: 'biryani andhra military chettinad north indian street chaat',
	sweet: 'desserts cake ice cream bakery',
	dessert: 'desserts cake ice cream bakery',
	breakfast: 'south indian dosa idli cafe coffee',
	coffee: 'cafes coffee',
	beer: 'bars breweries pub',
	drinks: 'bars breweries pub',
	date: 'date night italian desserts bars',
	cheap: 'street chaat darshini',
	veg: 'south indian veg'
};

function relevant(map: FoodMap, question: string) {
	if (map.spots.length <= MAX_SPOTS) return map.spots;
	const words = question.toLowerCase().match(/[a-z₹0-9]+/g) ?? [];
	const terms = words
		.flatMap((w) => [w, ...(HINTS[w]?.split(' ') ?? [])])
		.filter((w) => w.length > 2);
	const score = (s: FoodMap['spots'][number]) => {
		const lists = map.lists.filter((l) => l.spotIds.includes(s.id)).map((l) => l.name);
		const hay = [s.name, s.area, spotCategoryLabel(map, s), s.recommendation ?? '', ...lists]
			.join(' ')
			.toLowerCase();
		return terms.reduce((n, t) => n + (hay.includes(t) ? 1 : 0), 0);
	};
	return map.spots
		.map((s, i) => ({ s, i, n: score(s) }))
		.sort((a, b) => b.n - a.n || a.i - b.i)
		.slice(0, MAX_SPOTS)
		.map((x) => x.s);
}

function context(map: FoodMap, question: string) {
	const spots = relevant(map, question);
	const lines = spots.map((s, i) => {
		const lists = map.lists.filter((l) => l.spotIds.includes(s.id)).map((l) => l.name);
		return [
			`#${i + 1}`,
			s.name,
			s.area,
			spotCategoryLabel(map, s) || 'food spot',
			lists.length ? `lists: ${lists.join(', ')}` : '',
			s.recommendation ? `tip: ${s.recommendation}` : 'no tip'
		]
			.filter(Boolean)
			.join(' | ');
	});
	return { spots, text: lines.join('\n') };
}

function systemPrompt(owner: string) {
	return `You are the friendly voice of ${owner}'s Bangalore food map. A visitor asks what to eat.
Answer using ONLY the spots listed below. Pick up to 3 that fit best.
Base every reason on the spot's tip, category, lists or area. Never invent dishes, prices,
timings or facts that aren't written there. If a tip says what to order, mention it.
If nothing fits well, say so kindly and offer the closest picks.
In "reply" and "why", call spots by their name, never by their number.
You can't check live details (opening hours, today's menu, prices). If asked, say so in a few
words and suggest tapping "Take me there" to see them on Google Maps.
Tone: warm, casual, like a friend from Bangalore. "reply" is at most 35 words; each "why" at most 18 words.
Respond with JSON only: {"reply": string, "picks": [{"n": spot number, "why": string}]}`;
}

export async function askMap(map: FoodMap, question: string): Promise<AskAnswer> {
	const { spots, text } = context(map, question);
	const system = `${systemPrompt(map.profile.displayName)}\n\nSpots:\n${text}`;
	const user = question.slice(0, 200);

	const raw = await aiJson<{
		reply?: unknown;
		picks?: { n?: unknown; why?: unknown }[];
	}>(system, user);

	// Trust nothing: keep only real spot numbers, deduplicated, at most 3.
	const seen = new Set<string>();
	const picks = (Array.isArray(raw.picks) ? raw.picks : [])
		.map((p) => ({ spot: spots[Number(p.n) - 1], why: String(p.why ?? '').slice(0, 160) }))
		.filter((p) => p.spot && !seen.has(p.spot.id) && seen.add(p.spot.id))
		.slice(0, 3)
		.map((p) => ({ id: p.spot.id, why: p.why }));

	return {
		reply: String(raw.reply ?? '').slice(0, 300) || 'Here’s what I’d try.',
		picks
	};
}
