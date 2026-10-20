<script lang="ts">
	import { page } from '$app/state';

	// Link-preview tags (WhatsApp, Instagram, X, iMessage). `query` picks the preview image variant.
	type Props = { title: string; description: string; handle: string; query?: string };
	let { title, description, handle, query = '' }: Props = $props();

	const image = $derived(`${page.url.origin}/og/${handle}.png${query}`);
	const url = $derived(`${page.url.origin}${page.url.pathname}`);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={url} />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="blr_eats" />
	<meta property="og:url" content={url} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={image} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content={title} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={image} />
</svelte:head>
