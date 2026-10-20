import type { CategoryKey } from './categories.ts';
import { resizePhoto } from './image.ts';
import { slugify } from './slug.ts';
import { supabase } from './supabase.ts';
import type { Spot } from './types.ts';

// Owner writes go straight from the browser to Supabase; RLS only lets owners
// touch their own rows and their own photo folder.

export type SpotInput = {
	name: string;
	lat: number;
	lng: number;
	area: string;
	category: CategoryKey | null;
	customCategoryId: string | null;
	recommendation: string | null;
	reelUrl: string | null;
	osmId: string | null;
};

function uniqueSlug(base: string, taken: Set<string>): string {
	const root = base || 'spot';
	let slug = root;
	for (let i = 2; taken.has(slug); i++) slug = `${root}-${i}`;
	taken.add(slug);
	return slug;
}

function row(ownerId: string, input: SpotInput, slug: string) {
	return {
		owner_id: ownerId,
		slug,
		name: input.name.trim(),
		lat: input.lat,
		lng: input.lng,
		area: input.area.trim(),
		area_slug: slugify(input.area),
		category: input.category,
		custom_category_id: input.customCategoryId,
		recommendation: input.recommendation?.trim() || null,
		reel_url: input.reelUrl?.trim() || null,
		osm_id: input.osmId
	};
}

function fail(error: { message: string } | null): never | void {
	if (error) throw new Error(error.message);
}

/** Insert one or many spots; returns their ids in the same order. */
export async function createSpots(ownerId: string, inputs: SpotInput[], existing: Spot[]): Promise<string[]> {
	const taken = new Set(existing.map((s) => s.slug));
	const rows = inputs.map((i) => row(ownerId, i, uniqueSlug(slugify(`${i.name} ${i.area}`), taken)));
	const { data, error } = await supabase().from('spots').insert(rows).select('id');
	fail(error);
	return (data ?? []).map((d) => d.id as string);
}

export async function updateSpot(ownerId: string, spot: Spot, input: SpotInput): Promise<void> {
	const { owner_id: _, slug: __, ...patch } = row(ownerId, input, spot.slug);
	const { error } = await supabase().from('spots').update(patch).eq('id', spot.id);
	fail(error);
}

export async function deleteSpot(spot: Spot): Promise<void> {
	const paths = spot.photos.flatMap((p) => [p.path, p.thumbPath]);
	if (paths.length) await supabase().storage.from('photos').remove(paths);
	const { error } = await supabase().from('spots').delete().eq('id', spot.id);
	fail(error);
}

export async function addPhotos(ownerId: string, spotId: string, files: File[], startAt = 0): Promise<void> {
	const db = supabase();
	for (const [i, file] of files.entries()) {
		const photo = await resizePhoto(file);
		const id = crypto.randomUUID();
		const path = `${ownerId}/${spotId}/${id}.${photo.ext}`;
		const thumbPath = `${ownerId}/${spotId}/${id}-thumb.${photo.ext}`;
		const contentType = photo.ext === 'webp' ? 'image/webp' : 'image/jpeg';
		const opts = { contentType, cacheControl: '31536000', upsert: false };
		const [a, b] = await Promise.all([
			db.storage.from('photos').upload(path, photo.full, opts),
			db.storage.from('photos').upload(thumbPath, photo.thumb, opts)
		]);
		fail(a.error ?? b.error);
		const { error } = await db.from('spot_photos').insert({
			spot_id: spotId,
			owner_id: ownerId,
			path,
			thumb_path: thumbPath,
			width: photo.width,
			height: photo.height,
			position: startAt + i
		});
		fail(error);
	}
}

export async function deletePhoto(photo: Spot['photos'][number]): Promise<void> {
	await supabase().storage.from('photos').remove([photo.path, photo.thumbPath]);
	const { error } = await supabase().from('spot_photos').delete().eq('id', photo.id);
	fail(error);
}

export async function createCustomCategory(ownerId: string, name: string, emoji: string): Promise<string> {
	const { data, error } = await supabase()
		.from('custom_categories')
		.insert({ owner_id: ownerId, name: name.trim(), slug: slugify(name), emoji: emoji || '📍' })
		.select('id')
		.single();
	fail(error);
	return data!.id as string;
}

export async function updateProfile(ownerId: string, patch: { display_name?: string; bio?: string | null }) {
	const { error } = await supabase().from('profiles').update(patch).eq('id', ownerId);
	fail(error);
}
