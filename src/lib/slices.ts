import { CATEGORIES, categoryByKey } from './categories.ts';
import type { FoodMap, Slice, Spot } from './types.ts';

/** Resolve a slice URL segment: a fixed category, then a custom category, then an area. */
export function resolveSlice(map: FoodMap, slug: string): Slice | null {
	const fixed = CATEGORIES.find((c) => c.key === slug);
	if (fixed) {
		return { kind: 'category', slug, label: fixed.label, emoji: fixed.emoji, key: fixed.key };
	}
	const custom = map.customCategories.find((c) => c.slug === slug);
	if (custom) {
		return { kind: 'custom', slug, label: custom.name, emoji: custom.emoji, id: custom.id };
	}
	const list = map.lists.find((l) => l.slug === slug);
	if (list) return listSlice(list);
	const spot = map.spots.find((s) => s.areaSlug === slug);
	if (spot) return { kind: 'area', slug, label: spot.area, emoji: '📍' };
	return null;
}

function listSlice(list: FoodMap['lists'][number]): Slice {
	return {
		kind: 'list',
		slug: list.slug,
		label: list.name,
		emoji: list.emoji,
		id: list.id,
		spotIds: list.spotIds
	};
}

export function spotsInSlice(spots: Spot[], slice: Slice | null): Spot[] {
	if (!slice) return spots;
	switch (slice.kind) {
		case 'category':
			return spots.filter((s) => s.category === slice.key);
		case 'custom':
			return spots.filter((s) => s.customCategoryId === slice.id);
		case 'list':
			return spots.filter((s) => slice.spotIds.includes(s.id));
		case 'area':
			return spots.filter((s) => s.areaSlug === slice.slug);
	}
}

/** Every slice that has at least one spot, categories first, each sorted by spot count. */
export function availableSlices(map: FoodMap): { slice: Slice; count: number }[] {
	const count = (slice: Slice) => spotsInSlice(map.spots, slice).length;
	const byCount = (a: { count: number }, b: { count: number }) => b.count - a.count;

	const categories = [
		...CATEGORIES.map((c) => resolveSlice(map, c.key)!),
		...map.customCategories.map((c) => resolveSlice(map, c.slug)!)
	]
		.map((slice) => ({ slice, count: count(slice) }))
		.filter((s) => s.count > 0)
		.sort(byCount);

	// Hand-made lists first: they're the owner's own picks.
	const lists = map.lists
		.map(listSlice)
		.map((slice) => ({ slice, count: count(slice) }))
		.filter((s) => s.count > 0);

	const areaSlugs = [...new Set(map.spots.map((s) => s.areaSlug))];
	const areas = areaSlugs
		.map((slug) => resolveSlice(map, slug)!)
		.map((slice) => ({ slice, count: count(slice) }))
		.sort(byCount);

	// Slugs share one URL space; if two slices still clash, keep the one the URL resolves to.
	// (Two chips with one key would crash the page.)
	const seen = new Set<string>();
	return [...lists, ...categories, ...areas].filter(({ slice }) => {
		if (seen.has(slice.slug) || resolveSlice(map, slice.slug)?.kind !== slice.kind) return false;
		seen.add(slice.slug);
		return true;
	});
}

/** Emoji shown on a spot's pin and card. */
export function spotEmoji(map: FoodMap, spot: Spot): string {
	if (spot.category) return categoryByKey[spot.category].emoji;
	return map.customCategories.find((c) => c.id === spot.customCategoryId)?.emoji ?? '📍';
}

export function spotCategoryLabel(map: FoodMap, spot: Spot): string {
	if (spot.category) return categoryByKey[spot.category].label;
	return map.customCategories.find((c) => c.id === spot.customCategoryId)?.name ?? '';
}
