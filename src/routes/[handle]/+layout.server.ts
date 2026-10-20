import { error } from '@sveltejs/kit';
import { getMap } from '#lib/server/maps.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params, locals, parent }) => {
	const map = await getMap(locals.supabase, params.handle);
	if (!map) error(404, 'No food map here yet');

	// View counts are the owner's alone (RLS also enforces this).
	const { me } = await parent();
	let stats: { total: number; week: number } | null = null;
	if (me && me.id === map.profile.id) {
		const { data } = await locals.supabase
			.from('map_views')
			.select('day, views')
			.eq('profile_id', map.profile.id);
		const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
		const rows = (data ?? []) as { day: string; views: number }[];
		stats = {
			total: rows.reduce((n, r) => n + r.views, 0),
			week: rows.filter((r) => r.day > weekAgo).reduce((n, r) => n + r.views, 0)
		};
	}
	return { map, stats };
};
