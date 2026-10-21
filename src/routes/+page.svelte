<script lang="ts">
	import { page } from '$app/state';
	import SignIn from '#lib/components/SignIn.svelte';
	import PosterMiniMap from '#lib/components/PosterMiniMap.svelte';
	import FoodIcon from '#lib/components/FoodIcon.svelte';
	import InstagramIcon from '#lib/components/InstagramIcon.svelte';
	import { iconColors, iconKeyFor } from '#lib/look.ts';
	import { bengaluruPoster as theme, themeCssVars } from '#lib/theme.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const expired = $derived(page.url.searchParams.get('signin') === 'expired');
	const spots = $derived(data.demo);
	const spot = (name: string) => spots.find((s) => s.name === name);
	const hero = $derived(spot('Vidyarthi Bhavan'));
	const sweet = $derived(spot('Corner House'));

	// The "before": how food recs travel today.
	const chat = [
		'1. CTR malleshwaram – benne dosa, go early',
		'2. vidyarthi bhavan (masala dosa obv)',
		'3. meghana koramangala boneless biryani!!',
		'4. toit for beers',
		'5. corner house – death by chocolate',
		'also koshys for breakfast'
	];
	const fromChat = $derived(
		['CTR', 'Vidyarthi Bhavan', 'Meghana Foods', 'Toit', 'Corner House', "Koshy's"]
			.map(spot)
			.filter((s) => s !== undefined)
	);

	const steps = [
		{
			n: '1',
			title: 'Tell us your spots',
			body: 'Type it like you’d text a friend, say it out loud, or drop in screenshots and Google Maps links. We find every place.'
		},
		{
			n: '2',
			title: 'Get your map',
			body: 'Each spot pinned with its address and your tip. Pick a look: Bengaluru Poster or Namma Pop.'
		},
		{
			n: '3',
			title: 'Share one link',
			body: 'Your whole map, just your dosa places, or one spot. It previews beautifully in WhatsApp.'
		}
	];

	const shares = [
		{ path: '/demo', what: 'Your whole map', when: 'For your Instagram bio' },
		{ path: '/demo/south-indian', what: 'A slice', when: '“Where should I get dosa?”' },
		{
			path: '/demo/spot/vidyarthi-bhavan-basavanagudi',
			what: 'One spot',
			when: '“You HAVE to try this”'
		}
	];
</script>

<svelte:head>
	<title>blr_eats · Your Bangalore food map</title>
	<meta
		name="description"
		content="Turn your favourite Bangalore food spots into one map your friends actually open. Type, say or screenshot your list; share one link."
	/>
	<meta property="og:title" content="blr_eats · Your Bangalore food map" />
	<meta property="og:description" content="Stop sending food lists. Share a map." />
	<meta property="og:image" content="{page.url.origin}/og/demo.png" />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<div class="look-poster landing" style={themeCssVars(theme)}>
	<!-- Hero -->
	<header
		class="mx-auto grid max-w-5xl gap-10 px-5 pt-8 pb-14 md:grid-cols-2 md:items-center md:pt-16"
	>
		<div class="flex flex-col gap-5">
			<p class="text-sm font-extrabold tracking-[0.22em] uppercase">blr_eats · Bengaluru</p>
			<h1 class="title text-[54px] leading-[0.92] font-black md:text-7xl">
				Stop sending food <span class="strike">lists</span>.
			</h1>
			<p class="text-xl leading-snug font-semibold opacity-80">
				Turn your favourite Bangalore spots into one map your friends actually open. They tap a pin,
				see what to order, and go eat.
			</p>
			<div class="flex flex-col gap-3">
				{#if data.me?.handle}
					<a href="/{data.me.handle}" class="cta">Open my map →</a>
				{:else if data.me}
					<a href="/welcome" class="cta">Finish making my map →</a>
				{:else}
					{#if expired}
						<p class="font-extrabold text-accent">That sign-in expired. Try again.</p>
					{/if}
					<SignIn />
				{/if}
				<a
					href="/demo"
					class="text-center font-extrabold underline decoration-2 underline-offset-4"
				>
					See a real map first →
				</a>
			</div>
			<p class="text-sm font-semibold opacity-60">Free · takes two minutes · no app to install</p>
		</div>

		{#if spots.length}
			<div class="relative mx-auto w-full max-w-[380px]">
				<PosterMiniMap
					{spots}
					{theme}
					ratio="1 / 1"
					label="Demo’s Bengaluru · {spots.length} spots"
				/>
				{#if hero}
					<div
						class="float-card absolute -bottom-6 -left-3 w-[78%] rounded-3xl border-2 border-ink bg-surface p-3.5"
					>
						<div class="flex items-center gap-2.5">
							<span
								class="grid size-11 shrink-0 place-items-center rounded-full border-2 border-ink"
								style="background:{iconColors(theme, hero).spot}"
							>
								<FoodIcon kind={iconKeyFor(hero)} colors={iconColors(theme, hero)} size={30} />
							</span>
							<div class="min-w-0">
								<p class="title truncate text-lg leading-tight font-black">{hero.name}</p>
								<p class="truncate text-xs font-semibold opacity-60">
									{hero.address} · {hero.area}
								</p>
							</div>
						</div>
						<p class="mt-2 text-[15px] leading-snug font-semibold">“{hero.recommendation}”</p>
					</div>
				{/if}
			</div>
		{/if}
	</header>

	<!-- Before / after: the whole idea in one picture -->
	<section class="band">
		<div class="mx-auto max-w-5xl px-5 py-14">
			<h2 class="title text-4xl leading-none font-black md:text-5xl">
				From this <span class="opacity-40">→</span> to this.
			</h2>
			<p class="mt-3 max-w-xl text-lg font-semibold opacity-75">
				Food recs travel as forwarded lists that nobody saves. A map is something people open, tap
				around and come back to.
			</p>
			<div class="mt-8 grid items-center gap-6 md:grid-cols-[1fr_auto_1fr]">
				<div class="chat mx-auto w-full max-w-[360px]">
					<p class="mb-1 text-xs font-bold italic opacity-60">↪ Forwarded</p>
					{#each chat as line (line)}
						<p class="text-[15px] leading-snug">{line}</p>
					{/each}
					<p class="mt-1 text-right text-[11px] opacity-50">11:42 pm ✓✓</p>
				</div>
				<p class="text-center text-4xl font-black md:rotate-0" aria-hidden="true">↓</p>
				<div class="mx-auto w-full max-w-[300px]">
					<PosterMiniMap spots={fromChat} {theme} pop={false} names ratio="1 / 1" />
				</div>
			</div>
		</div>
	</section>

	<!-- How it works -->
	<section class="mx-auto max-w-5xl px-5 py-14">
		<h2 class="title text-4xl leading-none font-black md:text-5xl">Your map in two minutes.</h2>
		<ol class="mt-8 grid gap-4 md:grid-cols-3">
			{#each steps as s (s.n)}
				<li class="card">
					<span class="num">{s.n}</span>
					<h3 class="title mt-3 text-2xl leading-tight font-black">{s.title}</h3>
					<p class="mt-1.5 font-semibold opacity-75">{s.body}</p>
				</li>
			{/each}
		</ol>
		<div class="mt-5 flex flex-wrap gap-2 text-sm font-extrabold">
			<span class="pill">💬 Type it</span>
			<span class="pill">🎙️ Say it</span>
			<span class="pill">📷 Screenshots</span>
			<span class="pill">📍 Google Maps links</span>
			<span class="pill">🔎 Typo-proof search</span>
		</div>
	</section>

	<!-- Share sizes -->
	<section class="band">
		<div class="mx-auto max-w-5xl px-5 py-14">
			<h2 class="title text-4xl leading-none font-black md:text-5xl">
				Share whatever’s on screen.
			</h2>
			<p class="mt-3 max-w-xl text-lg font-semibold opacity-75">
				Filter your map and the Share button shares exactly that. Every link opens instantly, no
				login, no app.
			</p>
			<ul class="mt-8 grid gap-3 md:grid-cols-3">
				{#each shares as s (s.path)}
					<li class="min-w-0">
						<a href={s.path} class="card block h-full">
							<p class="title text-2xl font-black">{s.what}</p>
							<p class="mt-0.5 font-semibold opacity-70">{s.when}</p>
							<p class="link mt-3 truncate">blr-eats.vercel.app{s.path}</p>
						</a>
					</li>
				{/each}
			</ul>
		</div>
	</section>

	<!-- Ask the map -->
	<section class="mx-auto grid max-w-5xl gap-8 px-5 py-14 md:grid-cols-2 md:items-center">
		<div>
			<h2 class="title text-4xl leading-none font-black md:text-5xl">People can ask your map.</h2>
			<p class="mt-3 text-lg font-semibold opacity-75">
				“Somewhere sweet after dinner?” Visitors ask in their own words, and the answer comes only
				from your spots and your tips. It never makes places up.
			</p>
		</div>
		{#if sweet}
			<div class="card flex flex-col gap-3">
				<p class="self-end rounded-2xl rounded-br-md bg-ink px-3.5 py-2 font-bold text-paper">
					somewhere sweet after dinner in town?
				</p>
				<div class="flex items-start gap-2.5">
					<span
						class="grid size-11 shrink-0 place-items-center rounded-full border-2 border-ink"
						style="background:{iconColors(theme, sweet).spot}"
					>
						<FoodIcon kind={iconKeyFor(sweet)} colors={iconColors(theme, sweet)} size={30} />
					</span>
					<div>
						<p class="title text-xl leading-tight font-black">{sweet.name}</p>
						<p class="text-sm font-semibold opacity-60">{sweet.address} · {sweet.area}</p>
						<p class="mt-1 font-semibold">“{sweet.recommendation}”</p>
					</div>
				</div>
				<p class="text-xs font-extrabold tracking-wider uppercase opacity-50">✨ Ask the map</p>
			</div>
		{/if}
	</section>

	<!-- Creators -->
	<section class="band">
		<div class="mx-auto max-w-5xl px-5 py-14">
			<h2 class="title text-4xl leading-none font-black md:text-5xl">Made for food creators.</h2>
			<ul class="mt-8 grid gap-4 md:grid-cols-3">
				<li class="card">
					<InstagramIcon class="size-8" />
					<h3 class="title mt-2 text-2xl font-black">A Follow button</h3>
					<p class="mt-1 font-semibold opacity-75">
						Every map links to your Instagram, and every tip is credited to you.
					</p>
				</li>
				<li class="card">
					<span class="text-3xl">👀</span>
					<h3 class="title mt-2 text-2xl font-black">See who’s looking</h3>
					<p class="mt-1 font-semibold opacity-75">
						View counts for your map, so you know what your followers open.
					</p>
				</li>
				<li class="card">
					<span class="text-3xl">🔗</span>
					<h3 class="title mt-2 text-2xl font-black">One link in bio</h3>
					<p class="mt-1 font-semibold opacity-75">
						Answer “where should I eat?” for the hundredth time with one link.
					</p>
				</li>
			</ul>
		</div>
	</section>

	<!-- Final call -->
	<section class="mx-auto flex max-w-md flex-col gap-4 px-5 py-16 text-center">
		<h2 class="title text-5xl leading-[0.95] font-black">Your map is two minutes away.</h2>
		<p class="text-lg font-semibold opacity-75">Start with the five places you always recommend.</p>
		{#if data.me?.handle}
			<a href="/{data.me.handle}" class="cta">Open my map →</a>
		{:else if data.me}
			<a href="/welcome" class="cta">Finish making my map →</a>
		{:else}
			<SignIn />
		{/if}
	</section>

	<footer
		class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-5 pb-10 text-sm font-semibold opacity-60"
	>
		<span>Made in Bengaluru 🌳</span>
		<span class="flex gap-4">
			<a href="/demo" class="underline">Demo map</a>
			<a href="/privacy" class="underline">Privacy</a>
		</span>
		<span class="w-full text-xs">
			Place data: Overture Maps Foundation, © OpenStreetMap contributors.
		</span>
	</footer>
</div>

<style>
	.landing {
		background: var(--paper);
		min-height: 100dvh;
	}
	.strike {
		position: relative;
		white-space: nowrap;
	}
	.strike::after {
		content: '';
		position: absolute;
		left: -3%;
		right: -3%;
		top: 55%;
		height: 0.13em;
		background: var(--accent);
		border-radius: 999px;
		transform: rotate(-4deg);
	}
	.cta {
		display: block;
		border: 2px solid var(--ink);
		border-radius: 999px;
		background: var(--sun);
		padding: 12px;
		text-align: center;
		font-size: 1.25rem;
		font-weight: 800;
	}
	.band {
		background: var(--surface);
		border-block: 2px solid var(--ink);
	}
	.card {
		border: 2px solid var(--ink);
		border-radius: 24px;
		background: var(--surface);
		padding: 18px;
		box-shadow: 4px 4px 0 var(--ink);
	}
	.band .card {
		background: var(--paper);
	}
	.num {
		display: grid;
		width: 40px;
		height: 40px;
		place-items: center;
		border: 2px solid var(--ink);
		border-radius: 999px;
		background: var(--sun);
		font-weight: 900;
	}
	.pill {
		border: 2px solid var(--ink);
		border-radius: 999px;
		background: var(--surface);
		padding: 4px 12px;
	}
	.link {
		font-family: ui-monospace, monospace;
		font-size: 13px;
		font-weight: 700;
		color: var(--accent);
	}
	.chat {
		border-radius: 18px 18px 18px 4px;
		background: #dcf8c6;
		color: #111;
		padding: 10px 14px;
		box-shadow: 0 1px 2px rgb(0 0 0 / 0.2);
		font-family: system-ui, sans-serif;
	}
	.float-card {
		box-shadow: 5px 5px 0 var(--ink);
		animation: rise 600ms cubic-bezier(0.34, 1.3, 0.64, 1) 900ms both;
	}
	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(16px);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.float-card {
			animation: none;
		}
	}
</style>
