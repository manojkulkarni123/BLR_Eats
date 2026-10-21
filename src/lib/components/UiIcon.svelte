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
		menu: 'M5 8h14M5 16h14',
		paste:
			'M9 4h6v3H9Z M9 5.5H6.5A1.5 1.5 0 0 0 5 7v12.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V7a1.5 1.5 0 0 0-1.5-1.5H15 M8.5 12h7M8.5 16h4.5',
		mic: 'M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6',
		camera:
			'M4 8.5A1.5 1.5 0 0 1 5.5 7H8l1.5-2.5h5L16 7h2.5A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5Z M12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
		link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1 M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
		eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
		phone:
			'M8 3h8a1.5 1.5 0 0 1 1.5 1.5v15A1.5 1.5 0 0 1 16 21H8a1.5 1.5 0 0 1-1.5-1.5v-15A1.5 1.5 0 0 1 8 3Z M10.5 18h3',
		slice: 'M12 3a9 9 0 1 0 9 9h-9Z M15 3.5A8.5 8.5 0 0 1 20.5 9H15Z'
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
