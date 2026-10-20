<script lang="ts">
	import { ICONS, type IconColors, type IconKey } from '#lib/icons.ts';

	// One of our food illustrations: the colour layer printed slightly off-register under
	// the ink outline (see icons.ts). The same drawing iconSvg() renders as a string.
	type Props = { kind: IconKey; colors: IconColors; size?: number; offset?: number };
	let { kind, colors, size = 64, offset = 2.4 }: Props = $props();

	const shapes = $derived(ICONS[kind] ?? ICONS.spot);
</script>

<svg viewBox="-2 -2 68 68" width={size} height={size} aria-hidden="true">
	<g transform="translate({offset} {offset})">
		{#each shapes as s, i (i)}
			{#if s.fill !== 'line'}<path d={s.d} fill={colors[s.fill]} />{/if}
		{/each}
	</g>
	<g
		fill="none"
		stroke={colors.ink}
		stroke-width="3"
		stroke-linecap="round"
		stroke-linejoin="round"
	>
		{#each shapes as s, i (i)}<path d={s.d} />{/each}
	</g>
</svg>
