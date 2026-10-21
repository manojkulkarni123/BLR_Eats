import { error, json } from '@sveltejs/kit';
import { aiEnabled, aiTranscribe } from '#lib/server/ai.ts';
import type { RequestHandler } from './$types';

// 🎙️ in "Tell us your spots": a short voice note in, text out. The text then goes in the
// box, where it can be fixed before "Pin them".
const PER_OWNER_PER_DAY = 30;
const GLOBAL_PER_DAY = 900;
const MAX_BYTES = 3_000_000; // about two minutes of compressed speech

// Names Whisper wouldn't guess on its own; it spells what it expects to hear.
const HINT =
	'Bangalore food spots: CTR, MTR, Vidyarthi Bhavan, Meghana Foods, Toit, Truffles, Koshy’s, Brahmins Coffee Bar, Taaza Thindi, Rameshwaram Cafe, Third Wave. Areas: Malleshwaram, Basavanagudi, Jayanagar, Koramangala, Indiranagar, HSR Layout, Whitefield.';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!aiEnabled) error(503, 'This isn’t switched on yet');
	const user = await locals.getUser();
	if (!user) error(401, 'Sign in first');

	const form = await request.formData().catch(() => null);
	const audio = form?.get('audio');
	if (!(audio instanceof Blob) || audio.size < 1000) error(400, 'We didn’t catch that. Try again');
	if (audio.size > MAX_BYTES) error(413, 'That’s a long one! Keep it under two minutes');

	const { data: allowed } = await locals.supabase.rpc('take_ai_ask', {
		p_key: `voice:${user.id}`,
		p_per_key: PER_OWNER_PER_DAY,
		p_global: GLOBAL_PER_DAY
	});
	if (allowed === false) error(429, 'Lots of voice notes today! Type it instead, or try tomorrow');

	try {
		return json({ text: await aiTranscribe(audio, HINT) });
	} catch (e) {
		console.error('transcribe failed', e);
		error(502, 'Couldn’t hear that. Try again in a moment');
	}
};
