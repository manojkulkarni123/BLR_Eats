import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, parent }) => {
	const { map } = await parent();
	const spot = map.spots.find((s) => s.slug === params.slug);
	if (!spot) error(404, 'This spot is not on the map');
	return { spot };
};
