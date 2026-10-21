import type { SupabaseClient } from '@supabase/supabase-js';
import type { CategoryKey } from '#lib/categories.ts';
import { photoUrl } from '#lib/supabase.ts';
import type { FoodMap } from '#lib/types.ts';
import { seedMaps } from './seed.ts';

type SpotRow = {
	id: string;
	slug: string;
	name: string;
	lat: number;
	lng: number;
	area: string;
	area_slug: string;
	address: string;
	category: CategoryKey | null;
	custom_category_id: string | null;
	recommendation: string | null;
	reel_url: string | null;
	spot_photos: {
		id: string;
		path: string;
		thumb_path: string;
		width: number;
		height: number;
		position: number;
	}[];
};

/** The one place that loads a map: the demo from seed data, everyone else from Supabase. */
export async function getMap(supabase: SupabaseClient, handle: string): Promise<FoodMap | null> {
	const key = handle.toLowerCase();
	if (seedMaps[key]) return seedMaps[key];

	const { data: profile } = await supabase
		.from('profiles')
		.select('id, handle, display_name, avatar_path, bio, instagram, theme')
		.eq('handle', key)
		.maybeSingle();
	if (!profile) return null;

	const [spots, categories, lists] = await Promise.all([
		supabase
			.from('spots')
			.select(
				'id, slug, name, lat, lng, area, area_slug, address, category, custom_category_id, recommendation, reel_url, spot_photos (id, path, thumb_path, width, height, position)'
			)
			.eq('owner_id', profile.id)
			.order('created_at', { ascending: false })
			.returns<SpotRow[]>(),
		supabase.from('custom_categories').select('id, name, slug, emoji').eq('owner_id', profile.id),
		supabase
			.from('lists')
			.select('id, name, slug, emoji, list_spots (spot_id)')
			.eq('owner_id', profile.id)
			.order('created_at')
			.returns<
				{
					id: string;
					name: string;
					slug: string;
					emoji: string;
					list_spots: { spot_id: string }[];
				}[]
			>()
	]);

	return {
		profile: {
			id: profile.id,
			handle: profile.handle,
			displayName: profile.display_name,
			avatarUrl: profile.avatar_path ? photoUrl(profile.avatar_path) : null,
			avatarPath: profile.avatar_path,
			bio: profile.bio,
			instagram: profile.instagram,
			theme: profile.theme
		},
		spots: (spots.data ?? []).map((s) => ({
			id: s.id,
			slug: s.slug,
			name: s.name,
			lat: s.lat,
			lng: s.lng,
			area: s.area,
			areaSlug: s.area_slug,
			address: s.address ?? '',
			category: s.category,
			customCategoryId: s.custom_category_id,
			recommendation: s.recommendation,
			reelUrl: s.reel_url,
			photos: [...s.spot_photos]
				.sort((a, b) => a.position - b.position)
				.map((p) => ({
					id: p.id,
					path: p.path,
					thumbPath: p.thumb_path,
					url: photoUrl(p.path),
					thumbUrl: photoUrl(p.thumb_path),
					width: p.width,
					height: p.height
				}))
		})),
		customCategories: categories.data ?? [],
		lists: (lists.data ?? []).map(({ list_spots, ...l }) => ({
			...l,
			spotIds: list_spots.map((x) => x.spot_id)
		}))
	};
}
