import { error, json } from '@sveltejs/kit';
import { askEnabled, askMap } from '#lib/server/ask.ts';
import { getMap } from '#lib/server/maps.ts';
import type { RequestHandler } from './$types';

// Free-tier guard rails: per visitor and overall, per day.
const PER_VISITOR_PER_DAY = 15;
const GLOBAL_PER_DAY = 900;

async function visitorKey(ip: string) {
	// Hash with the date so raw IPs are never stored and keys don't link across days.
	const data = new TextEncoder().encode(`${new Date().toISOString().slice(0, 10)}:${ip}`);
	const hash = await crypto.subtle.digest('SHA-256', data);
	return [...new Uint8Array(hash)]
		.slice(0, 12)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
	if (!askEnabled) error(503, 'Ask isn’t switched on yet');

	const { handle, question } = (await request.json().catch(() => ({}))) as {
		handle?: string;
		question?: string;
	};
	const q = String(question ?? '').trim();
	if (!handle || q.length < 3) error(400, 'Ask a question');

	const map = await getMap(locals.supabase, handle);
	if (!map || map.spots.length === 0) error(404, 'No map here');

	const { data: allowed } = await locals.supabase.rpc('take_ai_ask', {
		p_key: await visitorKey(getClientAddress()),
		p_per_key: PER_VISITOR_PER_DAY,
		p_global: GLOBAL_PER_DAY
	});
	if (allowed === false)
		error(429, 'Lots of questions today! Try again tomorrow, or browse the map.');

	try {
		return json(await askMap(map, q));
	} catch (e) {
		console.error('ask failed', e);
		error(502, 'The map is thinking too hard. Try again in a moment');
	}
};
