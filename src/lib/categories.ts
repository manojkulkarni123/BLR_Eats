// The fixed category list (see DECISIONS.md, "Cuisine categories").
// Colours live in the theme so a new theme can recolour every category.

export const CATEGORIES = [
	{ key: 'south-indian', label: 'South Indian', emoji: '🥞' },
	{ key: 'biryani', label: 'Biryani', emoji: '🍛' },
	{ key: 'north-indian', label: 'North Indian', emoji: '🍗' },
	{ key: 'chinese', label: 'Chinese & Dim sum', emoji: '🥟' },
	{ key: 'asian', label: 'Ramen & Asian', emoji: '🍜' },
	{ key: 'burgers', label: 'Burgers', emoji: '🍔' },
	{ key: 'pizza', label: 'Pizza', emoji: '🍕' },
	{ key: 'italian', label: 'Italian & Pasta', emoji: '🍝' },
	{ key: 'street-food', label: 'Street food & Chaat', emoji: '🌮' },
	{ key: 'cafes', label: 'Cafés', emoji: '☕' },
	{ key: 'desserts', label: 'Desserts', emoji: '🍰' },
	{ key: 'bars', label: 'Bars & Breweries', emoji: '🍺' }
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]['key'];

export const categoryByKey = Object.fromEntries(CATEGORIES.map((c) => [c.key, c])) as Record<
	CategoryKey,
	(typeof CATEGORIES)[number]
>;
