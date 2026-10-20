import { error } from '@sveltejs/kit';
import { getMap } from '#lib/server/maps.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params }) => {
	const map = await getMap(params.handle);
	if (!map) error(404, 'No food map here yet');
	return { map };
};
