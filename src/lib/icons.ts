// Our own food illustrations, drawn for blr_eats (replacing phone emoji, which look
// different on every device). Style: risograph print. A colour layer is printed slightly
// off-register under a hand-weight ink outline. Every icon is drawn on a 64×64 grid.

export type IconKey =
	| 'south-indian'
	| 'biryani'
	| 'north-indian'
	| 'chinese'
	| 'asian'
	| 'burgers'
	| 'pizza'
	| 'italian'
	| 'street-food'
	| 'cafes'
	| 'desserts'
	| 'bars'
	| 'spot';

/** `spot` = the category's ink colour, `paper`/`cream` = light fills, `line` = outline only. */
type Fill = 'spot' | 'paper' | 'cream' | 'ink' | 'line';
type Shape = { d: string; fill: Fill };

const circle = (cx: number, cy: number, r: number) =>
	`M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0Z`;
const ellipse = (cx: number, cy: number, rx: number, ry: number) =>
	`M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${rx * 2} 0a${rx} ${ry} 0 1 0 ${-rx * 2} 0Z`;
const rect = (x: number, y: number, w: number, h: number, r = 0) =>
	`M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}Z`;
const steam = (x: number, y: number) => `M${x} ${y}q4 -4 0 -8q-4 -4 0 -8`;

export const ICONS: Record<IconKey, Shape[]> = {
	// A rolled masala dosa on a plate, with a bowl of chutney.
	'south-indian': [
		{ d: ellipse(32, 46, 28, 8), fill: 'paper' },
		{ d: 'M6 42 L50 26 Q60 30 58 40 Q56 46 50 46 Z', fill: 'spot' },
		{ d: ellipse(53, 36, 5, 9), fill: 'cream' },
		{ d: 'M16 39 L48 28 M14 43 L50 35', fill: 'line' },
		{ d: 'M8 50 q6 -6 12 0 Z', fill: 'cream' }
	],
	// A biryani handi, rice mounded high, steaming.
	biryani: [
		{ d: 'M14 28 q18 -16 36 0 Z', fill: 'cream' },
		{ d: 'M12 30 h40 v4 q0 18 -20 18 q-20 0 -20 -18 Z', fill: 'spot' },
		{ d: rect(9, 27, 46, 6, 3), fill: 'spot' },
		{ d: 'M22 22 l2 1 M30 18 l2 1 M38 21 l2 1 M27 25 l2 1', fill: 'line' },
		{ d: steam(26, 12) + steam(38, 12), fill: 'line' }
	],
	// Curry in a kadai with a naan leaning in.
	'north-indian': [
		{ d: 'M38 30 q10 -26 18 -10 q4 10 -8 12 Z', fill: 'cream' },
		{ d: 'M8 32 h48 q0 18 -24 18 q-24 0 -24 -18 Z', fill: 'spot' },
		{ d: ellipse(32, 32, 24, 5), fill: 'cream' },
		{ d: 'M4 34 h4 M56 34 h4', fill: 'line' },
		{ d: circle(24, 32, 2), fill: 'ink' }
	],
	// A bamboo steamer of dumplings.
	chinese: [
		{ d: rect(9, 34, 46, 16, 5), fill: 'spot' },
		{ d: 'M9 41 h46', fill: 'line' },
		{ d: 'M13 34 q7 -18 14 0 Z', fill: 'paper' },
		{ d: 'M25 34 q7 -20 14 0 Z', fill: 'paper' },
		{ d: 'M37 34 q7 -18 14 0 Z', fill: 'paper' },
		{ d: 'M20 22 v4 M32 19 v4 M44 22 v4', fill: 'line' }
	],
	// Ramen: bowl, noodles, egg and chopsticks.
	asian: [
		{ d: 'M36 6 L58 26 M44 4 L60 20', fill: 'line' },
		{ d: 'M8 30 h48 q0 22 -24 22 q-24 0 -24 -22 Z', fill: 'spot' },
		{ d: ellipse(32, 30, 24, 5), fill: 'cream' },
		{ d: 'M16 30 q4 -6 8 0 t8 0 t8 0 t8 0', fill: 'line' },
		{ d: ellipse(40, 29, 6, 3.5), fill: 'paper' },
		{ d: circle(40, 29, 2), fill: 'spot' }
	],
	// A stacked burger with sesame.
	burgers: [
		{ d: 'M10 28 q22 -24 44 0 Z', fill: 'spot' },
		{ d: 'M22 18 l2 -1 M32 14 l2 -1 M40 19 l2 -1', fill: 'line' },
		{ d: 'M8 30 q4 4 8 0 t8 0 t8 0 t8 0 t8 0 t8 0', fill: 'line' },
		{ d: rect(10, 32, 44, 8, 4), fill: 'ink' },
		{ d: rect(10, 42, 44, 10, 5), fill: 'spot' }
	],
	// A slice of pizza with pepperoni.
	pizza: [
		{ d: 'M12 14 L52 14 L32 56 Z', fill: 'spot' },
		{ d: rect(9, 9, 46, 9, 4.5), fill: 'cream' },
		{ d: circle(26, 26, 4), fill: 'paper' },
		{ d: circle(38, 28, 3.5), fill: 'paper' },
		{ d: circle(32, 40, 3.5), fill: 'paper' }
	],
	// Spaghetti twirled on a fork, on a plate.
	italian: [
		{ d: ellipse(32, 46, 27, 8), fill: 'paper' },
		{ d: 'M14 44 q2 -16 18 -16 q16 0 18 16 Z', fill: 'spot' },
		{ d: 'M20 40 q6 -8 12 0 q6 8 12 0 M24 34 q8 -6 16 0', fill: 'line' },
		{ d: 'M32 4 v22 M28 4 v8 q0 4 4 4 q4 0 4 -4 v-8', fill: 'line' }
	],
	// Pani puri on a leaf plate.
	'street-food': [
		{ d: 'M6 44 q26 -16 52 0 q-26 14 -52 0 Z', fill: 'spot' },
		{ d: 'M8 44 h48', fill: 'line' },
		{ d: circle(20, 36, 8), fill: 'cream' },
		{ d: circle(36, 34, 8), fill: 'cream' },
		{ d: circle(28, 24, 8), fill: 'cream' },
		{ d: circle(21, 34, 2.5) + circle(37, 32, 2.5) + circle(29, 22, 2.5), fill: 'ink' }
	],
	// South Indian filter coffee: tumbler in a davara, frothy.
	cafes: [
		{ d: 'M6 44 h52 l-6 10 h-40 Z', fill: 'spot' },
		{ d: 'M20 18 h24 l-3 28 h-18 Z', fill: 'spot' },
		{ d: ellipse(32, 18, 12, 3.5), fill: 'cream' },
		{ d: 'M23 26 h18', fill: 'line' },
		{ d: steam(28, 12) + steam(36, 12), fill: 'line' }
	],
	// A slice of layer cake with a cherry.
	desserts: [
		{ d: 'M8 30 L44 18 L56 26 L56 50 L8 50 Z', fill: 'spot' },
		{ d: 'M8 30 L44 18 L56 26 L20 38 Z', fill: 'cream' },
		{ d: 'M8 42 L56 42', fill: 'line' },
		{ d: 'M20 38 V50', fill: 'line' },
		{ d: circle(40, 16, 5), fill: 'ink' },
		{ d: 'M40 11 q2 -6 6 -6', fill: 'line' }
	],
	// A frothy mug of beer.
	bars: [
		{ d: 'M46 26 h6 q6 0 6 6 v6 q0 6 -6 6 h-6', fill: 'line' },
		{ d: rect(14, 22, 32, 32, 4), fill: 'spot' },
		{ d: 'M12 22 q2 -10 10 -8 q4 -8 12 -4 q8 -6 12 4 q4 4 0 8 Z', fill: 'paper' },
		{ d: 'M22 30 v18 M30 30 v18 M38 30 v18', fill: 'line' }
	],
	// Anything else (custom categories): a plate with cutlery.
	spot: [
		{ d: circle(32, 34, 18), fill: 'paper' },
		{ d: circle(32, 34, 11), fill: 'spot' },
		{ d: 'M6 18 v12 q0 4 4 4 v18 M10 18 v12 M14 18 v12 q0 4 -4 4', fill: 'line' },
		{ d: 'M56 18 q-6 6 -4 16 h4 v18', fill: 'line' }
	]
};

export type IconColors = { spot: string; ink: string; paper: string; cream: string };

/** SVG markup for an icon, for places that need a string (map markers, share images). */
export function iconSvg(key: IconKey, colors: IconColors, size = 64, offset = 2.4): string {
	const shapes = ICONS[key] ?? ICONS.spot;
	const fills = shapes
		.filter((s) => s.fill !== 'line')
		.map((s) => `<path d="${s.d}" fill="${colors[s.fill as Exclude<Fill, 'line'>]}"/>`)
		.join('');
	const lines = shapes.map((s) => `<path d="${s.d}"/>`).join('');
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 68 68" width="${size}" height="${size}" aria-hidden="true"><g transform="translate(${offset} ${offset})">${fills}</g><g fill="none" stroke="${colors.ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${lines}</g></svg>`;
}
