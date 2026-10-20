import { AI_API_KEY, AI_BASE_URL, AI_FALLBACK_MODEL, AI_MODEL } from '$app/env/private';
import { spotCategoryLabel } from '#lib/slices.ts';
import type { FoodMap } from '#lib/types.ts';

// "Ask this map": a visitor asks in their own words; the model picks spots from this
// map only, using the owner's own tips. It never sees anything but the map's public data.

export const askEnabled = Boolean(AI_API_KEY);

export type AskAnswer = { reply: string; picks: { id: string; why: string }[] };

const MAX_SPOTS = 150;

function context(map: FoodMap) {
	const spots = map.spots.slice(0, MAX_SPOTS);
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
Tone: warm, casual, like a friend from Bangalore. "reply" is at most 35 words; each "why" at most 18 words.
Respond with JSON only: {"reply": string, "picks": [{"n": spot number, "why": string}]}`;
}

async function complete(model: string, system: string, user: string) {
	return fetch(`${AI_BASE_URL}/chat/completions`, {
		method: 'POST',
		headers: { Authorization: `Bearer ${AI_API_KEY}`, 'Content-Type': 'application/json' },
		body: JSON.stringify({
			model,
			temperature: 0.4,
			max_tokens: 400,
			response_format: { type: 'json_object' },
			messages: [
				{ role: 'system', content: system },
				{ role: 'user', content: user }
			]
		}),
		signal: AbortSignal.timeout(15000)
	});
}

export async function askMap(map: FoodMap, question: string): Promise<AskAnswer> {
	const { spots, text } = context(map);
	const system = `${systemPrompt(map.profile.displayName)}\n\nSpots:\n${text}`;
	const user = question.slice(0, 200);

	let res = await complete(AI_MODEL, system, user);
	// The free tier rate-limits the big model first; the small one has a much larger quota.
	if (res.status === 429) res = await complete(AI_FALLBACK_MODEL, system, user);
	if (!res.ok) throw new Error(`AI ${res.status}`);

	const body = (await res.json()) as { choices: { message: { content: string } }[] };
	const raw = JSON.parse(body.choices[0]?.message?.content ?? '{}') as {
		reply?: unknown;
		picks?: { n?: unknown; why?: unknown }[];
	};

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
