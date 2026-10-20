<script lang="ts">
	import '@fontsource/baloo-2/latin-600.css';
	import '@fontsource/baloo-2/latin-800.css';
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import { nammaPop, themeCssVars } from '#lib/theme.ts';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
	<link rel="manifest" href="/manifest.webmanifest" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-title" content="blr_eats" />
	<link rel="preconnect" href="https://tiles.openfreemap.org" crossorigin="anonymous" />
	<meta name="theme-color" content={nammaPop.ui.paper} />
</svelte:head>

<div style={themeCssVars(nammaPop)} class="contents">
	{@render children()}
</div>
