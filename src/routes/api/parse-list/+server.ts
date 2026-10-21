import { error, json } from '@sveltejs/kit';
import { aiEnabled } from '#lib/server/ai.ts';
import { MAX_LIST_CHARS, parseList } from '#lib/server/parse-list.ts';
import type { RequestHandler } from './$types';

// Owners only, and a few lists a day each: one paste is one AI call plus many searches.
const PER_OWNER_PER_DAY = 20;
const GLOBAL_PER_DAY = 900;

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!aiEnabled) error(503, 'This isn’t switched on yet');
	const user = await locals.getUser();
	if (!user) error(401, 'Sign in first');

	const { text } = (await request.json().catch(() => ({}))) as { text?: string };
	const list = String(text ?? '').trim();
	if (list.length < 3) error(400, 'Paste your list first');
	if (list.length > MAX_LIST_CHARS) error(400, 'That’s a long list! Paste it in two goes');

	const { data: allowed } = await locals.supabase.rpc('take_ai_ask', {
		p_key: `list:${user.id}`,
		p_per_key: PER_OWNER_PER_DAY,
		p_global: GLOBAL_PER_DAY
	});
	if (allowed === false) error(429, 'You’ve pasted a lot today! Try again tomorrow');

	try {
		return json({ items: await parseList(locals.supabase, list) });
	} catch (e) {
		console.error('parse-list failed', e);
		error(502, 'Couldn’t read that list. Try again in a moment');
	}
};
