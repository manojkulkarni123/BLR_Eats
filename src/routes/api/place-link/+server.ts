import { error, json } from '@sveltejs/kit';
import { MAPS_LINK, placeFromMapsLink } from '#lib/server/google-maps.ts';
import type { RequestHandler } from './$types';

// A Google Maps link pasted into place search. Server-side because the short link's
// redirect can't be followed from the browser (CORS).
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!(await locals.getUser())) error(401, 'Sign in first');
	const { url } = (await request.json().catch(() => ({}))) as { url?: string };
	const link = String(url ?? '').match(MAPS_LINK)?.[0];
	if (!link) error(400, 'That’s not a Google Maps link');
	const place = await placeFromMapsLink(link).catch(() => null);
	if (!place) error(404, 'Couldn’t find a Bangalore place in that link');
	return json(place);
};
