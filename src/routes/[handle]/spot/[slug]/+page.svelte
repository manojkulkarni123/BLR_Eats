<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const title = $derived(`${data.spot.name}, ${data.spot.area}`);
	const description = $derived(
		data.spot.recommendation ?? `Recommended by ${data.map.profile.displayName}`
	);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
</svelte:head>
