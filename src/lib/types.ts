import type { CategoryKey } from './categories.ts';

export type Profile = {
	id: string;
	handle: string;
	displayName: string;
	avatarUrl: string | null;
	/** Storage path of the photo, to replace it later. */
	avatarPath: string | null;
	bio: string | null;
	/** Instagram username, without the @. */
	instagram: string | null;
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
	/** Street address, e.g. "32, Gandhi Bazaar Main Rd". Empty when unknown. */
	address: string;
	/** A fixed category key, or null when the spot uses a custom category. */
	category: CategoryKey | null;
	customCategoryId: string | null;
	recommendation: string | null;
	reelUrl: string | null;
	photos: {
		id: string;
		path: string;
		thumbPath: string;
		url: string;
		thumbUrl: string;
		width: number;
		height: number;
	}[];
};

/** A hand-picked list of spots, e.g. "Date night". */
export type SpotList = {
	id: string;
	name: string;
	slug: string;
	emoji: string;
	spotIds: string[];
};

export type FoodMap = {
	profile: Profile;
	spots: Spot[];
	customCategories: CustomCategory[];
	lists: SpotList[];
};

/** What a slice URL segment resolved to. */
export type Slice =
	| { kind: 'category'; slug: string; label: string; emoji: string; key: CategoryKey }
	| { kind: 'custom'; slug: string; label: string; emoji: string; id: string }
	| { kind: 'list'; slug: string; label: string; emoji: string; id: string; spotIds: string[] }
	| { kind: 'area'; slug: string; label: string; emoji: string };
