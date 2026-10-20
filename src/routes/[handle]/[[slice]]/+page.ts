import { error } from '@sveltejs/kit';
import { resolveSlice, spotsInSlice } from '#lib/slices.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, parent }) => {
	const { map } = await parent();
	if (!params.slice) return { slice: null, count: map.spots.length };
	const slice = resolveSlice(map, params.slice);
	if (!slice) error(404, 'No spots in this slice');
	return { slice, count: spotsInSlice(map.spots, slice).length };
};
