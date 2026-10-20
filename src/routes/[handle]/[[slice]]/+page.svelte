<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const name = $derived(data.map.profile.displayName);
	const title = $derived(
		data.slice ? `${name}'s ${data.slice.label} spots in Bangalore` : `${name}'s Bangalore food map`
	);
	const description = $derived(`${data.count} spots, picked by ${name}. Tap a spot to go eat there.`);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
</svelte:head>
