import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import font600 from '@fontsource/baloo-2/files/baloo-2-latin-600-normal.woff?inline';
import font800 from '@fontsource/baloo-2/files/baloo-2-latin-800-normal.woff?inline';
import fraunces900 from '@fontsource/fraunces/files/fraunces-latin-900-normal.woff?inline';
import fraunces600i from '@fontsource/fraunces/files/fraunces-latin-600-italic.woff?inline';
import bricolage600 from '@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-600-normal.woff?inline';
import bricolage800 from '@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-800-normal.woff?inline';
import { iconSvg } from '#lib/icons.ts';
import { iconColors, iconKeyFor, lookOf } from '#lib/look.ts';
import { getTheme, swatchFor, type Theme } from '#lib/theme.ts';
import type { FoodMap, Spot } from '#lib/types.ts';

// Link-preview image (1200×630): the first impression in WhatsApp and Instagram,
// so it gets the same punchy look as the map. Drawn without map tiles so it's fast.

const W = 1200;
const H = 630;

type Node = {
	type: string;
	props: { style?: Record<string, unknown>; children?: unknown; [k: string]: unknown };
};
const h = (
	type: string,
	style: Record<string, unknown>,
	children?: unknown,
	extra: object = {}
): Node => ({
	type,
	props: { style: { display: 'flex', ...style }, children, ...extra }
});

const toBuffer = (dataUrl: string) => Buffer.from(dataUrl.split(',')[1], 'base64');
const fonts = [
	{ name: 'Baloo', data: toBuffer(font600), weight: 600 as const, style: 'normal' as const },
	{ name: 'Baloo', data: toBuffer(font800), weight: 800 as const, style: 'normal' as const },
	{ name: 'Fraunces', data: toBuffer(fraunces900), weight: 900 as const, style: 'normal' as const },
	{
		name: 'Fraunces',
		data: toBuffer(fraunces600i),
		weight: 600 as const,
		style: 'italic' as const
	},
	{
		name: 'Bricolage',
		data: toBuffer(bricolage600),
		weight: 600 as const,
		style: 'normal' as const
	},
	{
		name: 'Bricolage',
		data: toBuffer(bricolage800),
		weight: 800 as const,
		style: 'normal' as const
	}
];

// Emoji drawn from Twemoji, cached per process.
const emojiCache = new Map<string, string>();
async function emojiSvg(segment: string): Promise<string> {
	const code = [...segment]
		.map((c) => c.codePointAt(0)!.toString(16))
		.filter((c) => c !== 'fe0f')
		.join('-');
	if (!emojiCache.has(code)) {
		const res = await fetch(
			`https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/${code}.svg`
		);
		const svg = res.ok ? await res.text() : '';
		emojiCache.set(
			code,
			svg ? `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}` : ''
		);
	}
	return emojiCache.get(code)!;
}

/** Place spots inside a box, keeping the map's shape (simple equirectangular fit). */
function layout(spots: Spot[], box: { w: number; h: number; pad: number }) {
	const lats = spots.map((s) => s.lat);
	const lngs = spots.map((s) => s.lng);
	const minLat = Math.min(...lats),
		maxLat = Math.max(...lats);
	const minLng = Math.min(...lngs),
		maxLng = Math.max(...lngs);
	const spanX = Math.max(maxLng - minLng, 0.01);
	const spanY = Math.max(maxLat - minLat, 0.01);
	const scale = Math.min((box.w - box.pad * 2) / spanX, (box.h - box.pad * 2) / spanY);
	const offX = (box.w - spanX * scale) / 2;
	const offY = (box.h - spanY * scale) / 2;
	return spots.map((s) => ({
		spot: s,
		x: offX + (s.lng - minLng) * scale,
		y: offY + (maxLat - s.lat) * scale
	}));
}

export type OgInput = {
	map: FoodMap;
	title: string;
	subtitle: string;
	spots: Spot[];
	emojiFor: (s: Spot) => string;
	/** Poster look: small-caps line above the headline, and the headline itself. */
	kicker?: string;
	heading?: string;
};

const dataUri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

/** The Bengaluru Poster preview card: serif headline on cream, illustrated mini-map. */
async function renderPoster(
	theme: Theme,
	{ map, subtitle, spots, kicker, heading }: OgInput
): Promise<Buffer> {
	const ink = theme.ui.ink;
	const box = { w: 500, h: 540, pad: 64 };
	const pins = layout(spots.slice(0, 40), box);
	const PIN = spots.length > 20 ? 54 : 70;
	const head = heading ?? 'Bengaluru';
	const block = (style: Record<string, unknown>) => h('div', { position: 'absolute', ...style });

	const pinNodes = pins.map(({ spot, x, y }) => {
		const colors = iconColors(theme, spot);
		const size = Math.round(PIN * 0.72);
		return h(
			'div',
			{
				position: 'absolute',
				left: x - PIN / 2,
				top: y - PIN / 2,
				width: PIN,
				height: PIN,
				borderRadius: PIN,
				background: theme.ui.surface,
				border: `3px solid ${ink}`,
				boxShadow: `4px 4px 0 ${colors.spot}`,
				alignItems: 'center',
				justifyContent: 'center'
			},
			h('img', { width: size, height: size }, undefined, {
				src: dataUri(iconSvg(iconKeyFor(spot), colors, 64)),
				width: size,
				height: size
			})
		);
	});

	const tree = h(
		'div',
		{
			width: W,
			height: H,
			background: theme.ui.paper,
			fontFamily: 'Bricolage',
			color: ink,
			padding: 48,
			gap: 44
		},
		[
			h(
				'div',
				{
					flexDirection: 'column',
					justifyContent: 'space-between',
					width: W - 96 - 44 - box.w,
					height: H - 96,
					flexShrink: 0
				},
				[
					h('div', { flexDirection: 'column' }, [
						h(
							'div',
							{ fontSize: 30, fontWeight: 800, letterSpacing: 6, textTransform: 'uppercase' },
							kicker ?? `${map.profile.displayName.split(' ')[0]}’s`
						),
						h(
							'div',
							{
								fontFamily: 'Fraunces',
								fontWeight: 900,
								fontSize: head.length > 14 ? 74 : head.length > 10 ? 92 : 112,
								lineHeight: 0.92,
								letterSpacing: -3,
								marginTop: 6
							},
							head
						),
						h(
							'div',
							{
								fontFamily: 'Fraunces',
								fontStyle: 'italic',
								fontWeight: 600,
								fontSize: 34,
								color: '#C2187A',
								marginTop: 18,
								lineHeight: 1.15
							},
							subtitle
						)
					]),
					h('div', { alignItems: 'center', gap: 18 }, [
						h(
							'div',
							{
								background: ink,
								color: theme.ui.paper,
								borderRadius: 999,
								padding: '12px 30px',
								fontSize: 30,
								fontWeight: 800
							},
							'Open the map'
						),
						h('div', { fontSize: 28, fontWeight: 800, opacity: 0.6 }, 'blr_eats')
					])
				]
			),
			h(
				'div',
				{
					position: 'relative',
					width: box.w,
					height: box.h,
					flexShrink: 0,
					borderRadius: 32,
					background: theme.map.residential,
					border: `4px solid ${ink}`,
					boxShadow: `8px 8px 0 ${theme.ui.accent}`,
					overflow: 'hidden'
				},
				[
					// A few strokes standing in for roads, a lake and a park.
					block({
						left: -40,
						top: 210,
						width: 620,
						height: 16,
						background: theme.map.roadMajor,
						transform: 'rotate(-14deg)'
					}),
					block({
						left: 220,
						top: -40,
						width: 16,
						height: 640,
						background: theme.map.roadMajor,
						transform: 'rotate(10deg)'
					}),
					block({
						left: 300,
						top: 320,
						width: 150,
						height: 100,
						borderRadius: 80,
						background: theme.map.water
					}),
					block({
						left: 40,
						top: 380,
						width: 160,
						height: 110,
						borderRadius: 70,
						background: theme.map.park
					}),
					...pinNodes
				]
			)
		]
	);

	const svg = await satori(tree as never, { width: W, height: H, fonts });
	return new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng();
}

export async function renderOg({
	map,
	title,
	subtitle,
	spots,
	emojiFor,
	kicker,
	heading
}: OgInput): Promise<Buffer> {
	const theme = getTheme(map.profile.theme);
	if (lookOf(theme) === 'poster') {
		return renderPoster(theme, { map, title, subtitle, spots, emojiFor, kicker, heading });
	}
	const ink = theme.ui.ink;
	const box = { w: 520, h: 540, pad: 60 };
	const pins = layout(spots.slice(0, 40), box);
	const PIN = spots.length > 20 ? 52 : 68;

	const pinNodes = pins.map(({ spot, x, y }) => {
		const { bg } = swatchFor(theme, spot.category);
		return h(
			'div',
			{
				position: 'absolute',
				left: x - PIN / 2,
				top: y - PIN / 2,
				width: PIN,
				height: PIN,
				borderRadius: PIN,
				background: bg,
				border: `4px solid ${ink}`,
				boxShadow: `4px 4px 0 ${ink}`,
				alignItems: 'center',
				justifyContent: 'center',
				fontSize: PIN * 0.5
			},
			emojiFor(spot)
		);
	});

	const emojis = [...new Set(spots.map(emojiFor))].slice(0, 6);

	const tree = h(
		'div',
		{
			width: W,
			height: H,
			background: theme.ui.paper,
			fontFamily: 'Baloo',
			color: ink,
			padding: 45,
			gap: 40
		},
		[
			h(
				'div',
				{
					flexDirection: 'column',
					justifyContent: 'space-between',
					width: W - 90 - 40 - box.w,
					height: H - 90,
					flexShrink: 0
				},
				[
					h('div', { flexDirection: 'column', gap: 18 }, [
						h(
							'div',
							{ gap: 10 },
							emojis.map((e) => h('div', { fontSize: 50 }, e))
						),
						h(
							'div',
							{ fontSize: title.length > 30 ? 58 : 68, fontWeight: 800, lineHeight: 1 },
							title
						),
						h('div', { fontSize: 30, fontWeight: 600, opacity: 0.75, lineHeight: 1.2 }, subtitle)
					]),
					h('div', { alignItems: 'center', gap: 14 }, [
						h(
							'div',
							{
								background: theme.ui.sun,
								border: `4px solid ${ink}`,
								boxShadow: `5px 5px 0 ${ink}`,
								borderRadius: 999,
								padding: '8px 28px',
								fontSize: 34,
								fontWeight: 800
							},
							'👉 Open the map'
						),
						h('div', { fontSize: 28, fontWeight: 800, opacity: 0.6 }, 'blr_eats')
					])
				]
			),
			h(
				'div',
				{
					position: 'relative',
					width: box.w,
					flexShrink: 0,
					height: box.h,
					borderRadius: 40,
					background: theme.map.land,
					border: `5px solid ${ink}`,
					boxShadow: `8px 8px 0 ${ink}`,
					overflow: 'hidden'
				},
				[
					// A few bold strokes standing in for roads, lakes and parks.
					h('div', {
						position: 'absolute',
						left: -40,
						top: 200,
						width: 640,
						height: 22,
						background: theme.map.roadMajor,
						transform: 'rotate(-18deg)'
					}),
					h('div', {
						position: 'absolute',
						left: 230,
						top: -40,
						width: 22,
						height: 640,
						background: theme.map.roadMajor,
						transform: 'rotate(12deg)'
					}),
					h('div', {
						position: 'absolute',
						left: 340,
						top: 300,
						width: 150,
						height: 110,
						borderRadius: 80,
						background: theme.map.water
					}),
					h('div', {
						position: 'absolute',
						left: 40,
						top: 360,
						width: 170,
						height: 120,
						borderRadius: 70,
						background: theme.map.park
					}),
					h('div', {
						position: 'absolute',
						left: 300,
						top: 40,
						width: 120,
						height: 90,
						borderRadius: 60,
						background: theme.map.park
					}),
					...pinNodes
				]
			)
		]
	);

	const svg = await satori(tree as never, {
		width: W,
		height: H,
		fonts,
		loadAdditionalAsset: async (code, segment) => (code === 'emoji' ? emojiSvg(segment) : '')
	});
	return new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng();
}
