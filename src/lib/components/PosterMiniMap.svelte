<script lang="ts">
	import FoodIcon from './FoodIcon.svelte';
	import { iconColors, iconKeyFor } from '#lib/look.ts';
	import type { Theme } from '#lib/theme.ts';
	import type { Spot } from '#lib/types.ts';

	// A drawn, static mini-map in the Bengaluru Poster look: a few roads, a lake, a park
	// and the spots as illustrated pins. For the landing page, where loading MapLibre
	// would only slow the first screen down.
	type Props = {
		spots: Spot[];
		theme: Theme;
		label?: string;
		pop?: boolean;
		/** Show each spot's name under its pin. */
		names?: boolean;
		/** Box shape, as a CSS aspect-ratio. */
		ratio?: string;
	};
	let { spots, theme, label, pop = true, names = false, ratio = '4 / 5' }: Props = $props();

	// Place spots inside the box, keeping the city's shape, then nudge apart the ones that
	// would sit on top of each other (several Basavanagudi favourites are a street apart).
	const pins = $derived.by(() => {
		const lats = spots.map((s) => s.lat);
		const lngs = spots.map((s) => s.lng);
		const [minLat, maxLat] = [Math.min(...lats), Math.max(...lats)];
		const [minLng, maxLng] = [Math.min(...lngs), Math.max(...lngs)];
		const top = label ? 24 : 12;
		const bottom = names ? 80 : 88;
		const pts = spots.map((s, i) => ({
			s,
			i,
			x: 12 + ((s.lng - minLng) / (maxLng - minLng || 1)) * 76,
			y: top + ((maxLat - s.lat) / (maxLat - minLat || 1)) * (bottom - top)
		}));
		const gap = names ? 23 : 13;
		// Names hang under the pin, so labelled pins need room from the edges too.
		const [left, right] = names ? [20, 80] : [10, 90];
		for (let round = 0; round < 40; round++) {
			for (const a of pts)
				for (const b of pts) {
					if (a === b) continue;
					const dx = b.x - a.x;
					const dy = b.y - a.y;
					const d = Math.hypot(dx, dy) || 0.01;
					if (d >= gap) continue;
					const push = (gap - d) / 2;
					a.x -= (dx / d) * push;
					a.y -= (dy / d) * push;
				}
			for (const p of pts) {
				p.x = Math.min(right, Math.max(left, p.x));
				p.y = Math.min(bottom, Math.max(top, p.y));
			}
		}
		return pts;
	});
	const m = $derived(theme.map);
</script>

<div
	style:aspect-ratio={ratio}
	class="relative w-full overflow-hidden rounded-[28px] border-[2.5px] border-ink"
	style="background:{m.residential};box-shadow:6px 6px 0 var(--accent)"
>
	<svg class="absolute inset-0 h-full w-full" viewBox="0 0 100 125" preserveAspectRatio="none">
		<path
			d="M-5 40 C 25 30, 55 55, 105 44"
			stroke={m.roadMajorCasing}
			stroke-width="4.2"
			fill="none"
		/>
		<path d="M-5 40 C 25 30, 55 55, 105 44" stroke={m.roadMajor} stroke-width="3" fill="none" />
		<path
			d="M38 -5 C 42 40, 30 80, 46 130"
			stroke={m.roadMajorCasing}
			stroke-width="4.2"
			fill="none"
		/>
		<path d="M38 -5 C 42 40, 30 80, 46 130" stroke={m.roadMajor} stroke-width="3" fill="none" />
		<path d="M-5 95 C 30 88, 70 104, 105 92" stroke={m.roadMinor} stroke-width="2" fill="none" />
		<path d="M72 -5 C 66 40, 80 80, 70 130" stroke={m.roadMinor} stroke-width="2" fill="none" />
		<ellipse cx="78" cy="70" rx="13" ry="8" fill={m.water} />
		<ellipse cx="18" cy="108" rx="15" ry="9" fill={m.park} />
		<ellipse cx="60" cy="18" rx="9" ry="6" fill={m.park} />
	</svg>
	{#each pins as { s, i, x, y } (s.id)}
		{@const c = iconColors(theme, s)}
		<span
			class="pin absolute grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-ink"
			class:pop
			style="left:{x}%;top:{y}%;background:{theme.ui
				.surface};box-shadow:3px 3px 0 {c.spot};animation-delay:{300 + i * 90}ms"
		>
			<FoodIcon kind={iconKeyFor(s)} colors={c} size={30} offset={1.4} />
			{#if names}
				<span
					class="absolute top-full left-1/2 mt-1 -translate-x-1/2 rounded-full bg-ink px-2 py-px text-[11px] font-extrabold whitespace-nowrap text-paper"
					>{s.name}</span
				>
			{/if}
		</span>
	{/each}
	{#if label}
		<span
			class="absolute top-3 left-3 rounded-2xl border-2 border-ink bg-surface px-3 py-1.5 text-sm leading-tight font-extrabold"
			>{label}</span
		>
	{/if}
</div>

<style>
	.pin.pop {
		animation: pin-pop 520ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
	}
	@keyframes pin-pop {
		from {
			opacity: 0;
			transform: translate(-50%, -50%) scale(0.2);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.pin.pop {
			animation: none;
		}
	}
</style>
