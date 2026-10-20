<script lang="ts" module>
	// Interface icons, drawn in the same rounded ink stroke as the food illustrations
	// (24×24 grid), so buttons and stickers look like one family.
	const PATHS = {
		share: 'M7 17 17 7M9 7h8v8',
		directions: 'M12 3 21 12 12 21 3 12Z M9 13v-2h5V8.5l3 3.5-3 3.5V13',
		search: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13ZM20 20l-4.8-4.8',
		close: 'M6 6l12 12M18 6 6 18',
		near: 'M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
		add: 'M12 5v14M5 12h14',
		edit: 'M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4',
		// "Ask": a speech bubble with a spark, not the generic ✨.
		ask: 'M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z M12 8.5v5M9.5 11h5',
		heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z',
		menu: 'M5 8h14M5 16h14'
	} as const;
	export type UiIconName = keyof typeof PATHS;
</script>

<script lang="ts">
	let {
		name,
		size = 20,
		stroke = 2.4
	}: { name: UiIconName; size?: number; stroke?: number } = $props();
</script>

<svg
	viewBox="0 0 24 24"
	width={size}
	height={size}
	fill="none"
	stroke="currentColor"
	stroke-width={stroke}
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	<path d={PATHS[name]} />
</svg>
