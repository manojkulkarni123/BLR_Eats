<script lang="ts">
	import { page } from '$app/state';
	import SignIn from '#lib/components/SignIn.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const expired = $derived(page.url.searchParams.get('signin') === 'expired');

	// Decorative stickers floating around the headline.
	const stickers = [
		{ e: '🥞', bg: '#FFBE0B', x: '6%', y: '8%', r: -12, d: 0 },
		{ e: '🍜', bg: '#FF8FAB', x: '78%', y: '5%', r: 10, d: 120 },
		{ e: '🍛', bg: '#FB5607', x: '84%', y: '30%', r: -8, d: 240 },
		{ e: '☕', bg: '#B5651D', x: '2%', y: '34%', r: 14, d: 360 },
		{ e: '🍺', bg: '#00B4D8', x: '70%', y: '52%', r: -14, d: 480 }
	];
</script>

<svelte:head>
	<title>blr_eats · Your Bangalore food map</title>
	<meta name="description" content="Pin the places you love to eat in Bangalore and share them as one colourful map." />
	<meta property="og:title" content="blr_eats · Your Bangalore food map" />
	<meta property="og:description" content="Stop sending food lists. Share a map." />
</svelte:head>

<main class="relative mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 overflow-hidden px-6 py-12">
	<div class="pointer-events-none absolute inset-0" aria-hidden="true">
		{#each stickers as s (s.e)}
			<span
				class="float sticker absolute grid size-14 place-items-center rounded-full text-3xl"
				style="left:{s.x};top:{s.y};background:{s.bg};--r:{s.r}deg;animation-delay:{s.d}ms"
			>
				{s.e}
			</span>
		{/each}
	</div>

	<div class="relative mt-28 flex flex-col gap-4">
		<h1 class="text-[56px] leading-[0.9] font-extrabold">
			Stop sending<br />food <span class="strike">lists</span>.
		</h1>
		<p class="text-xl font-semibold opacity-80">
			Pin your favourite Bangalore spots and share them as one colourful map. Your friends tap a spot and go
			eat.
		</p>
	</div>

	<div class="relative flex flex-col gap-3">
		{#if data.me?.handle}
			<a href="/{data.me.handle}" class="sticker rounded-full bg-sun py-3 text-center text-xl font-extrabold">
				Open my map →
			</a>
		{:else if data.me}
			<a href="/welcome" class="sticker rounded-full bg-sun py-3 text-center text-xl font-extrabold">
				Finish making my map →
			</a>
		{:else}
			{#if expired}
				<p class="font-extrabold text-accent">That sign-in link expired. Enter your email again.</p>
			{/if}
			<SignIn />
		{/if}
		<a href="/demo" class="text-center font-extrabold underline decoration-2 underline-offset-4">
			Peek at a demo map
		</a>
	</div>
</main>

<style>
	.float {
		rotate: var(--r);
		animation: pop-in 480ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
	}
	.strike {
		position: relative;
		white-space: nowrap;
	}
	.strike::after {
		content: '';
		position: absolute;
		left: -4%;
		right: -4%;
		top: 52%;
		height: 0.14em;
		background: var(--accent);
		border-radius: 999px;
		transform: rotate(-4deg);
	}
</style>
