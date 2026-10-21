import { getMap } from '#lib/server/maps.ts';
import type { PageServerLoad } from './$types';

// The landing page draws its mock-ups from the demo map, so they show real spots and tips.
export const load: PageServerLoad = async ({ locals }) => {
	const demo = await getMap(locals.supabase, 'demo');
	return { demo: demo?.spots ?? [] };
};
