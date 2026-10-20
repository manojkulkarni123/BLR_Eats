<script lang="ts">
	import ShareMeta from '#lib/components/ShareMeta.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const name = $derived(data.map.profile.displayName);
	const title = $derived(
		data.slice ? `${name}'s ${data.slice.label} spots in Bangalore` : `${name}'s Bangalore food map`
	);
	const description = $derived(
		`${data.count} spots, picked by ${name}. Tap a spot to go eat there.`
	);
</script>

<ShareMeta
	{title}
	{description}
	handle={data.map.profile.handle}
	query={data.slice ? `?slice=${data.slice.slug}` : ''}
/>
