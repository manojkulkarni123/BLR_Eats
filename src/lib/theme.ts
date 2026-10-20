import type { CategoryKey } from './categories.ts';

// A theme is one object: UI tokens, map colours and category colours.
// The UI reads them as CSS variables (themeCssVars), the map style and the
// link-preview images read the same values, so adding a theme is adding an object.

type Swatch = { bg: string; on: string };

export type Theme = {
	id: string;
	ui: {
		ink: string;
		paper: string;
		surface: string;
		accent: string;
		sun: string;
	};
	map: {
		land: string;
		residential: string;
		park: string;
		wood: string;
		water: string;
		building: string;
		roadMinor: string;
		roadMajor: string;
		roadMajorCasing: string;
		motorway: string;
		label: string;
		labelHalo: string;
	};
	categories: Record<CategoryKey, Swatch>;
	/** Shared colour for every user-created category. */
	wildcard: Swatch;
};

const INK = '#1E1532';
const WHITE = '#FFFFFF';

export const nammaPop: Theme = {
	id: 'namma-pop',
	ui: {
		ink: INK,
		paper: '#FFF3D6',
		surface: WHITE,
		accent: '#FF3D7F',
		sun: '#FFC93C'
	},
	map: {
		land: '#FFEFC7',
		residential: '#FFE7B5',
		park: '#8EE36B',
		wood: '#6CCF55',
		water: '#2E8BFF',
		building: '#F9D99A',
		roadMinor: WHITE,
		roadMajor: '#FFD84D',
		roadMajorCasing: '#E9A92B',
		motorway: '#FF8A3D',
		label: INK,
		labelHalo: '#FFF3D6'
	},
	categories: {
		'south-indian': { bg: '#FFBE0B', on: INK },
		biryani: { bg: '#FB5607', on: WHITE },
		'north-indian': { bg: '#D00000', on: WHITE },
		chinese: { bg: '#FF006E', on: WHITE },
		asian: { bg: '#FF8FAB', on: INK },
		burgers: { bg: '#8338EC', on: WHITE },
		pizza: { bg: '#06D6A0', on: INK },
		italian: { bg: '#3A86FF', on: WHITE },
		'street-food': { bg: '#A7E000', on: INK },
		cafes: { bg: '#B5651D', on: WHITE },
		desserts: { bg: '#E0AAFF', on: INK },
		bars: { bg: '#00B4D8', on: INK }
	},
	wildcard: { bg: WHITE, on: INK }
};

// "Bengaluru poster" (design preview): risograph spot inks on cream paper, quiet roads so
// the illustrated pins carry the colour.
const POSTER_INK = '#1F1A2E';
export const bengaluruPoster: Theme = {
	id: 'bengaluru-poster',
	ui: {
		ink: POSTER_INK,
		paper: '#F4EAD5',
		surface: '#FFFDF6',
		accent: '#FF48B0',
		sun: '#FFE800'
	},
	map: {
		land: '#F4EAD5',
		residential: '#EEE1C4',
		park: '#B9D89C',
		wood: '#A6CF8A',
		water: '#8DBDEB',
		building: '#E9DABB',
		roadMinor: '#FBF5E8',
		roadMajor: '#F3DFB4',
		roadMajorCasing: '#E3C68E',
		motorway: '#F2B98A',
		label: POSTER_INK,
		labelHalo: '#F4EAD5'
	},
	categories: {
		'south-indian': { bg: '#FFE800', on: POSTER_INK },
		biryani: { bg: '#FF6C2F', on: POSTER_INK },
		'north-indian': { bg: '#914E72', on: '#FFFDF6' },
		chinese: { bg: '#00838A', on: '#FFFDF6' },
		asian: { bg: '#FF48B0', on: POSTER_INK },
		burgers: { bg: '#FFB511', on: POSTER_INK },
		pizza: { bg: '#FF665E', on: POSTER_INK },
		italian: { bg: '#00A95C', on: '#FFFDF6' },
		'street-food': { bg: '#765BA7', on: '#FFFDF6' },
		cafes: { bg: '#925F52', on: '#FFFDF6' },
		desserts: { bg: '#62A8E5', on: POSTER_INK },
		bars: { bg: '#0078BF', on: '#FFFDF6' }
	},
	wildcard: { bg: '#FFFDF6', on: POSTER_INK }
};

export const themes: Record<string, Theme> = {
	[nammaPop.id]: nammaPop,
	[bengaluruPoster.id]: bengaluruPoster
};

export function getTheme(id: string | null | undefined): Theme {
	return (id && themes[id]) || nammaPop;
}

export function swatchFor(theme: Theme, category: CategoryKey | null): Swatch {
	return category ? theme.categories[category] : theme.wildcard;
}

/** Inline `style` value exposing the UI tokens as CSS variables. */
export function themeCssVars(theme: Theme): string {
	const { ui } = theme;
	return [
		`--ink:${ui.ink}`,
		`--paper:${ui.paper}`,
		`--surface:${ui.surface}`,
		`--accent:${ui.accent}`,
		`--sun:${ui.sun}`,
		`--map-land:${theme.map.land}`
	].join(';');
}
