import { getMap } from '#lib/server/maps.ts';
import type { PageServerLoad } from './$types';

// Design preview for the "Bengaluru poster" direction, built on the demo map.
export const load: PageServerLoad = async ({ locals }) => {
	const map = (await getMap(locals.supabase, 'demo'))!;
	return { map };
};
