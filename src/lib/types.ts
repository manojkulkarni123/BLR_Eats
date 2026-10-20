import type { CategoryKey } from './categories.ts';

export type Profile = {
	id: string;
	handle: string;
	displayName: string;
	avatarUrl: string | null;
	bio: string | null;
	theme: string;
};

export type CustomCategory = {
	id: string;
	name: string;
	slug: string;
	emoji: string;
};

export type Spot = {
	id: string;
	slug: string;
	name: string;
	lat: number;
	lng: number;
	area: string;
	areaSlug: string;
	/** A fixed category key, or null when the spot uses a custom category. */
	category: CategoryKey | null;
	customCategoryId: string | null;
	recommendation: string | null;
	reelUrl: string | null;
	photos: { id: string; url: string; thumbUrl: string; width: number; height: number }[];
};

export type FoodMap = {
	profile: Profile;
	spots: Spot[];
	customCategories: CustomCategory[];
};

/** What a slice URL segment resolved to. */
export type Slice =
	| { kind: 'category'; slug: string; label: string; emoji: string; key: CategoryKey }
	| { kind: 'custom'; slug: string; label: string; emoji: string; id: string }
	| { kind: 'area'; slug: string; label: string; emoji: string };
