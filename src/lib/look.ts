import { iconSvg, type IconColors, type IconKey } from './icons.ts';
import { swatchFor, type Theme } from './theme.ts';
import type { Spot } from './types.ts';

// The two map looks an owner can pick. Themes decide colours; the look decides layout
// details (illustrated pins vs emoji stickers, headline serif vs rounded type).
export type Look = 'pop' | 'poster';

export const LOOKS: { id: string; look: Look; name: string; blurb: string }[] = [
	{
		id: 'bengaluru-poster',
		look: 'poster',
		name: 'Bengaluru Poster',
		blurb: 'Cream paper, print inks, illustrated food'
	},
	{ id: 'namma-pop', look: 'pop', name: 'Namma Pop', blurb: 'Bright, bold, emoji stickers' }
];

export const DEFAULT_THEME_ID = 'bengaluru-poster';

export function lookOf(theme: Theme): Look {
	return theme.id === 'bengaluru-poster' ? 'poster' : 'pop';
}

export const iconKeyFor = (spot: Spot): IconKey => (spot.category ?? 'spot') as IconKey;

export function iconColors(theme: Theme, spot: Spot): IconColors {
	return {
		spot: swatchFor(theme, spot.category).bg,
		ink: theme.ui.ink,
		paper: theme.ui.surface,
		cream: '#F4D9A0'
	};
}

const escapeHtml = (t: string) => t.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Marker HTML for the poster look (MapView renders it inside the pin button). */
export function posterPinMarkup(theme: Theme, spot: Spot): string {
	const colors = iconColors(theme, spot);
	return (
		`<span class="ppin" style="--spot:${colors.spot}">` +
		`<span class="ppin-badge">${iconSvg(iconKeyFor(spot), colors, 38)}</span>` +
		`<span class="ppin-name">${escapeHtml(spot.name)}</span></span>`
	);
}
