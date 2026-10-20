<script lang="ts">
	import ShareMeta from '#lib/components/ShareMeta.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const title = $derived(`${data.spot.name}, ${data.spot.area}`);
	const description = $derived(
		data.spot.recommendation ?? `Recommended by ${data.map.profile.displayName}`
	);
</script>

<ShareMeta {title} {description} handle={data.map.profile.handle} query="?spot={data.spot.slug}" />
