<script lang="ts">
	import { page } from '$app/state';
	import MapScreen from '#lib/components/MapScreen.svelte';
	import type { LayoutProps } from './$types';

	// The map lives in the layout so switching between the whole map, a slice
	// and a spot keeps the same map instance instead of reloading it.
	let { data, children }: LayoutProps = $props();
</script>

<MapScreen
	map={data.map}
	sliceSlug={(page.params as { slice?: string }).slice ?? null}
	spotSlug={(page.params as { slug?: string }).slug ?? null}
/>

{@render children()}
