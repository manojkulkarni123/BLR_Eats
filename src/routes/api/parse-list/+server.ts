import { error, json } from '@sveltejs/kit';
import { aiEnabled } from '#lib/server/ai.ts';
import {
	MAX_LIST_CHARS,
	MAX_SCREENSHOTS,
	parseList,
	readScreenshots
} from '#lib/server/parse-list.ts';
import type { RequestHandler } from './$types';

// Owners only, and a few lists a day each: one paste is one AI call plus many searches.
const PER_OWNER_PER_DAY = 20;
const GLOBAL_PER_DAY = 900;

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!aiEnabled) error(503, 'This isn’t switched on yet');
	const user = await locals.getUser();
	if (!user) error(401, 'Sign in first');

	const { text, images } = (await request.json().catch(() => ({}))) as {
		text?: string;
		images?: unknown;
	};
	const list = String(text ?? '').trim();
	// Screenshots arrive shrunk in the browser (see screenshotForAi), as data URLs.
	const shots = (Array.isArray(images) ? images : [])
		.filter(
			(i): i is string => typeof i === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(i)
		)
		.filter((i) => i.length < 1_500_000);
	if (shots.length > MAX_SCREENSHOTS) error(400, `Up to ${MAX_SCREENSHOTS} screenshots at a time`);
	if (list.length < 3 && !shots.length) error(400, 'Tell us a few spots first');
	if (list.length > MAX_LIST_CHARS) error(400, 'That’s a long list! Paste it in two goes');

	const { data: allowed } = await locals.supabase.rpc('take_ai_ask', {
		p_key: `list:${user.id}`,
		p_per_key: PER_OWNER_PER_DAY,
		p_global: GLOBAL_PER_DAY
	});
	if (allowed === false) error(429, 'You’ve pasted a lot today! Try again tomorrow');

	try {
		const fromShots = await readScreenshots(shots);
		if (shots.length && !fromShots && list.length < 3)
			error(422, 'We couldn’t spot any food places in those screenshots');
		const all = [list, fromShots].filter(Boolean).join('\n');
		return json({ items: await parseList(locals.supabase, all) });
	} catch (e) {
		if (e && typeof e === 'object' && 'status' in e) throw e;
		console.error('parse-list failed', e);
		error(502, 'Couldn’t read that list. Try again in a moment');
	}
};
