import { error } from '@sveltejs/kit';
import { getMap } from '#lib/server/maps.ts';
import { renderOg } from '#lib/server/og.ts';
import { resolveSlice, spotEmoji, spotsInSlice } from '#lib/slices.ts';
import type { RequestHandler } from './$types';

// /og/<handle>.png            whole map
// /og/<handle>.png?slice=x    a slice
// /og/<handle>.png?spot=slug  one spot
export const GET: RequestHandler = async ({ params, url, locals }) => {
	const map = await getMap(locals.supabase, params.handle);
	if (!map) error(404);
	const name = map.profile.displayName;
	const emojiFor = (s: Parameters<typeof spotEmoji>[1]) => spotEmoji(map, s);

	let title = `${name}'s Bangalore food map`;
	let subtitle = `${map.spots.length} spots, picked by ${name}`;
	let spots = map.spots;

	const spotSlug = url.searchParams.get('spot');
	const sliceSlug = url.searchParams.get('slice');
	if (spotSlug) {
		const spot = map.spots.find((s) => s.slug === spotSlug);
		if (!spot) error(404);
		title = spot.name;
		subtitle = spot.recommendation ?? `${spot.area} · recommended by ${name}`;
		spots = [spot];
	} else if (sliceSlug) {
		const slice = resolveSlice(map, sliceSlug);
		if (!slice) error(404);
		spots = spotsInSlice(map.spots, slice);
		title = `${name}'s ${slice.label} spots`;
		subtitle = `${spots.length} ${slice.label} spots in Bangalore`;
	}
	if (subtitle.length > 90) subtitle = `${subtitle.slice(0, 87)}…`;

	const png = await renderOg({ map, title, subtitle, spots, emojiFor });
	return new Response(new Uint8Array(png), {
		headers: {
			'content-type': 'image/png',
			'cache-control': 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400'
		}
	});
};
