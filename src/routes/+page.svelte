<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import SignIn from '#lib/components/SignIn.svelte';
	import Phone from '#lib/components/Phone.svelte';
	import FoodIcon from '#lib/components/FoodIcon.svelte';
	import InstagramIcon from '#lib/components/InstagramIcon.svelte';
	import { bengaluruPoster as theme, themeCssVars } from '#lib/theme.ts';
	import type { CategoryKey } from '#lib/categories.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const expired = $derived(page.url.searchParams.get('signin') === 'expired');
	const signedIn = $derived(Boolean(data.me));
	const myMap = $derived(data.me?.handle ? `/${data.me.handle}` : '/welcome');

	// Food stickers floating around the hero phones.
	const sticker = (kind: CategoryKey) => ({
		spot: theme.categories[kind].bg,
		ink: theme.ui.ink,
		paper: theme.ui.surface,
		cream: '#F4D9A0'
	});

	// The "before": how food recs travel today.
	const chat = [
		'ok my list 👇',
		'1. CTR malleshwaram – benne dosa, go early',
		'2. meghana koramangala boneless biryani!!',
		'3. toit for beers',
		'4. corner house death by chocolate 🍫'
	];

	// The sticky "Make your map" bar shows once the hero's button has scrolled away.
	let heroCta: HTMLElement;
	let showBar = $state(false);
	onMount(() => {
		const io = new IntersectionObserver(([e]) => (showBar = !e.isIntersecting), {
			rootMargin: '0px 0px -40px 0px'
		});
		io.observe(heroCta);
		return () => io.disconnect();
	});
</script>

<svelte:head>
	<title>blr_eats · Your Bangalore food map</title>
	<meta
		name="description"
		content="Put your favourite Bangalore food spots on one map your friends will actually open. Paste a list, say it, or add screenshots; share one link."
	/>
	<meta property="og:title" content="blr_eats · Your Bangalore food map" />
	<meta property="og:description" content="Stop sending food lists. Share a map." />
	<meta property="og:image" content="{page.url.origin}/og/demo.png" />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<div class="look-poster landing" style={themeCssVars(theme)}>
	<nav class="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 md:px-8">
		<a href="/" class="title text-2xl font-black">blr_eats</a>
		<div class="flex items-center gap-4 text-[15px] font-extrabold">
			<a href="/demo" class="hidden underline-offset-4 hover:underline sm:inline">See a map</a>
			{#if signedIn}
				<a href={myMap} class="btn-ink">My map</a>
			{:else}
				<a href="#start" class="btn-ink">Make your map</a>
			{/if}
		</div>
	</nav>

	<!-- Hero -->
	<header
		class="mx-auto grid max-w-6xl items-center gap-12 px-5 pt-6 pb-4 md:grid-cols-[1.05fr_1fr] md:px-8 md:pt-14 md:pb-28"
	>
		<div id="start" class="flex flex-col gap-6">
			<h1 class="title hero-title font-black">
				Stop sending food <span class="strike">lists</span>.
			</h1>
			<p class="max-w-md text-xl leading-snug font-semibold opacity-75 md:text-2xl">
				Put your favourite Bangalore spots on one map. Friends tap a pin, see what to order, and go.
			</p>
			<div bind:this={heroCta} class="flex max-w-sm flex-col gap-3">
				{#if signedIn}
					<a href={myMap} class="btn-sun">{data.me?.handle ? 'Open my map →' : 'Finish my map →'}</a
					>
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
			<p class="text-sm font-bold opacity-55">Free · two minutes · nothing to install</p>
		</div>

		<div class="relative mx-auto h-[540px] w-full max-w-[460px] md:h-[620px]">
			<Phone
				src="/landing/spot.jpg"
				alt="A spot on a blr_eats map: Vidyarthi Bhavan, its address and the owner’s tip"
				tilt={7}
				class="absolute top-10 right-0 w-[56%] md:w-[58%]"
			/>
			<Phone
				src="/landing/map.jpg"
				alt="A blr_eats map of Bangalore with illustrated food pins"
				tilt={-5}
				eager
				class="absolute top-0 left-0 w-[60%] md:w-[62%]"
			/>
			<span class="sticker-badge" style="left:-2%;bottom:16%;rotate:-12deg">
				<FoodIcon kind="biryani" colors={sticker('biryani')} size={46} />
			</span>
			<span class="sticker-badge" style="right:-3%;top:2%;rotate:10deg">
				<FoodIcon kind="cafes" colors={sticker('cafes')} size={42} />
			</span>
			<span class="sticker-badge" style="right:8%;bottom:4%;rotate:-6deg">
				<FoodIcon kind="desserts" colors={sticker('desserts')} size={42} />
			</span>
		</div>
	</header>

	<!-- 1. The list you already have -->
	<section class="feature">
		<div class="copy">
			<p class="kicker">Got a list?</p>
			<h2 class="title h2 font-black">Paste the one you already sent.</h2>
			<p class="lede">
				That WhatsApp message with your 12 places? Drop it in. We find every spot, pick the right
				branch and keep your tips.
			</p>
		</div>
		<div class="flex flex-col items-center justify-center gap-4 md:flex-row md:gap-6">
			<div class="chat-bubble w-[78%] max-w-[300px] md:w-[52%]">
				{#each chat as line, i (line)}
					<p class={i === 0 ? 'mb-1 font-semibold' : ''}>{line}</p>
				{/each}
				<p class="mt-1 text-right text-[11px] opacity-50">11:42 pm ✓✓</p>
			</div>
			<span class="arrow" aria-hidden="true"
				><span class="md:hidden">↓</span><span class="hidden md:inline">→</span></span
			>
			<Phone
				src="/landing/review.jpg"
				alt="The pasted list turned into matched places with their tips"
				class="w-[58%] max-w-[260px] shrink-0 md:w-[40%]"
			/>
		</div>
	</section>

	<!-- 2. Other ways in -->
	<section class="feature flip">
		<div class="copy">
			<p class="kicker">No list? No problem.</p>
			<h2 class="title h2 font-black">Or just say it.</h2>
			<p class="lede">Tell us your spots the way you’d tell a friend.</p>
			<ul class="mt-6 grid gap-3 text-lg font-bold">
				<li class="way"><span>💬</span> Type it like a text</li>
				<li class="way"><span>🎙️</span> Say it out loud</li>
				<li class="way"><span>📷</span> Add screenshots from Zomato or Instagram</li>
				<li class="way"><span>📍</span> Paste Google Maps links</li>
			</ul>
		</div>
		<div class="flex justify-center">
			<Phone
				src="/landing/tell.jpg"
				alt="Tell us your spots: a text box with voice and screenshot buttons"
				tilt={-3}
				class="w-[62%] max-w-[290px]"
			/>
		</div>
	</section>

	<!-- 3. Sharing, from the friend's side -->
	<section class="feature">
		<div class="copy">
			<p class="kicker">Then share it</p>
			<h2 class="title h2 font-black">One link. They’re in.</h2>
			<p class="lede">
				Send your whole map, just your dosa spots, or one place. No app, no login. It just opens.
			</p>
		</div>
		<div class="flex justify-center">
			<div class="wa">
				<p class="wa-them">where should we eat this weekend??</p>
				<div class="wa-me">
					<div class="wa-preview">
						<img
							src="/og/demo.png"
							alt="The link preview of a blr_eats map"
							width="1200"
							height="630"
							loading="lazy"
						/>
						<div class="px-2.5 py-2">
							<p class="text-[13px] leading-tight font-bold">Demo's Bangalore food map</p>
							<p class="text-[12px] opacity-60">11 spots, picked by Demo</p>
							<p class="mt-0.5 text-[11px] opacity-50">blr-eats.vercel.app</p>
						</div>
					</div>
					<p class="mt-1.5">all my spots are here 👆</p>
				</div>
				<p class="wa-them">ok this is amazing. saving it</p>
			</div>
		</div>
	</section>

	<!-- 4. Ask -->
	<section class="feature flip">
		<div class="copy">
			<p class="kicker">Built in</p>
			<h2 class="title h2 font-black">They can ask it things.</h2>
			<p class="lede">
				“Somewhere sweet after dinner?” Answers come only from your spots and your tips. It never
				makes places up.
			</p>
		</div>
		<div class="flex justify-center">
			<Phone
				src="/landing/ask.jpg"
				alt="Ask the map answering ‘somewhere sweet after dinner?’ with Corner House"
				tilt={3}
				class="w-[62%] max-w-[290px]"
			/>
		</div>
	</section>

	<!-- Creators -->
	<section class="mx-auto max-w-6xl px-5 py-16 md:px-8">
		<div class="creators">
			<div>
				<p class="kicker">Food creator?</p>
				<h2 class="title h2 font-black">The link for your bio.</h2>
			</div>
			<ul class="grid gap-6 sm:grid-cols-3">
				<li>
					<InstagramIcon class="size-7" />
					<p class="mt-2 text-lg font-extrabold">A Follow button</p>
					<p class="font-semibold opacity-70">on your map, and your name on every tip.</p>
				</li>
				<li>
					<span class="text-2xl">👀</span>
					<p class="mt-2 text-lg font-extrabold">View counts</p>
					<p class="font-semibold opacity-70">so you know what your followers open.</p>
				</li>
				<li>
					<span class="text-2xl">🔗</span>
					<p class="mt-2 text-lg font-extrabold">One answer</p>
					<p class="font-semibold opacity-70">to “where should I eat?”, forever.</p>
				</li>
			</ul>
		</div>
	</section>

	<!-- Final call -->
	<section class="mx-auto flex max-w-xl flex-col items-center gap-5 px-5 pt-10 pb-24 text-center">
		<h2 class="title final font-black">Make your map. It takes two minutes.</h2>
		<p class="text-lg font-semibold opacity-70">Start with the five places you always recommend.</p>
		<div class="w-full max-w-sm">
			{#if signedIn}
				<a href={myMap} class="btn-sun">{data.me?.handle ? 'Open my map →' : 'Finish my map →'}</a>
			{:else}
				<SignIn />
			{/if}
		</div>
	</section>

	<footer
		class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 pb-28 text-sm font-semibold opacity-60 md:px-8 md:pb-10"
	>
		<span class="title text-lg font-black">blr_eats</span>
		<span class="flex gap-5">
			<a href="/demo" class="underline">Demo map</a>
			<a href="/privacy" class="underline">Privacy</a>
		</span>
		<span class="w-full text-xs">
			Made in Bengaluru. Place data: Overture Maps Foundation, © OpenStreetMap contributors.
		</span>
	</footer>

	{#if !signedIn}
		<div class="sticky-bar md:hidden" class:show={showBar} aria-hidden={!showBar}>
			<a href="#start" class="btn-sun" tabindex={showBar ? 0 : -1}>Make your map, free →</a>
		</div>
	{/if}
</div>

<style>
	.landing {
		background: var(--paper);
		min-height: 100dvh;
		overflow-x: clip;
	}
	.hero-title {
		font-size: clamp(56px, 8.4vw, 116px);
		line-height: 0.9;
		letter-spacing: -0.035em;
	}
	.h2 {
		font-size: clamp(38px, 4.6vw, 64px);
		line-height: 0.95;
		letter-spacing: -0.025em;
	}
	.final {
		font-size: clamp(44px, 5.6vw, 76px);
		line-height: 0.92;
		letter-spacing: -0.03em;
	}
	.kicker {
		margin-bottom: 12px;
		font-size: 13px;
		font-weight: 800;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--accent);
	}
	.lede {
		margin-top: 16px;
		max-width: 30rem;
		font-size: 1.25rem;
		line-height: 1.4;
		font-weight: 600;
		opacity: 0.75;
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
		top: 54%;
		height: 0.12em;
		background: var(--accent);
		border-radius: 999px;
		transform: rotate(-4deg);
	}
	.btn-ink {
		border-radius: 999px;
		background: var(--ink);
		color: var(--paper);
		padding: 8px 16px;
	}
	.btn-sun {
		display: block;
		border: 2px solid var(--ink);
		border-radius: 999px;
		background: var(--sun);
		padding: 13px;
		text-align: center;
		font-size: 1.2rem;
		font-weight: 800;
	}

	/* Feature rows: copy and visual side by side on wide screens, alternating sides. */
	.feature {
		display: grid;
		gap: 40px;
		max-width: 72rem;
		margin: 0 auto;
		padding: 64px 20px;
		align-items: center;
	}
	@media (min-width: 768px) {
		.feature {
			grid-template-columns: 1fr 1fr;
			gap: 64px;
			padding: 96px 32px;
		}
		.feature.flip .copy {
			order: 2;
		}
	}
	.way {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.way span {
		display: grid;
		width: 40px;
		height: 40px;
		flex-shrink: 0;
		place-items: center;
		border-radius: 999px;
		background: var(--surface);
		border: 2px solid var(--ink);
		font-size: 18px;
	}
	.arrow {
		font-size: 34px;
		font-weight: 900;
		flex-shrink: 0;
	}

	.sticker-badge {
		position: absolute;
		display: grid;
		width: 72px;
		height: 72px;
		place-items: center;
		border-radius: 999px;
		border: 2.5px solid var(--ink);
		background: var(--surface);
		box-shadow: 4px 4px 0 var(--ink);
		animation: bob 4s ease-in-out infinite;
	}
	.sticker-badge:nth-of-type(2) {
		animation-delay: -1.3s;
	}
	.sticker-badge:nth-of-type(3) {
		animation-delay: -2.6s;
	}
	@keyframes bob {
		50% {
			translate: 0 -8px;
		}
	}

	/* WhatsApp-ish chats, so the "before" and the shared link look like what people know. */
	.chat-bubble {
		border-radius: 16px 16px 4px 16px;
		background: #d9fdd3;
		color: #111b21;
		padding: 10px 12px;
		font-family: system-ui, sans-serif;
		font-size: 14px;
		line-height: 1.35;
		box-shadow: 0 1px 1px rgb(0 0 0 / 0.12);
		rotate: -2deg;
	}
	.wa {
		display: flex;
		width: 100%;
		max-width: 360px;
		flex-direction: column;
		gap: 10px;
		border-radius: 28px;
		background: #efe7dc;
		padding: 18px 14px;
		font-family: system-ui, sans-serif;
		font-size: 15px;
		color: #111b21;
		box-shadow: 0 30px 60px -24px rgb(30 21 50 / 0.4);
	}
	.wa-them,
	.wa-me {
		max-width: 86%;
		border-radius: 14px;
		padding: 8px 10px;
		box-shadow: 0 1px 1px rgb(0 0 0 / 0.12);
	}
	.wa-them {
		align-self: flex-start;
		background: #fff;
		border-top-left-radius: 4px;
	}
	.wa-me {
		align-self: flex-end;
		background: #d9fdd3;
		border-top-right-radius: 4px;
		padding: 4px;
	}
	.wa-me > p {
		padding: 0 6px 4px;
	}
	.wa-preview {
		overflow: hidden;
		border-radius: 10px;
		background: rgb(0 0 0 / 0.05);
	}
	.wa-preview img {
		display: block;
		width: 100%;
		height: auto;
	}

	.creators {
		display: grid;
		gap: 32px;
		border-radius: 32px;
		background: var(--ink);
		color: var(--paper);
		padding: 40px 28px;
	}
	.creators .kicker {
		color: var(--sun);
	}
	@media (min-width: 768px) {
		.creators {
			grid-template-columns: 0.9fr 1.6fr;
			align-items: center;
			padding: 56px;
		}
	}

	.sticky-bar {
		position: fixed;
		right: 0;
		bottom: 0;
		left: 0;
		z-index: 20;
		padding: 12px 16px max(12px, env(safe-area-inset-bottom));
		background: linear-gradient(to top, var(--paper) 70%, transparent);
		translate: 0 110%;
		transition: translate 250ms ease;
	}
	.sticky-bar.show {
		translate: 0 0;
	}
	@media (prefers-reduced-motion: reduce) {
		.sticker-badge {
			animation: none;
		}
		.sticky-bar {
			transition: none;
		}
	}
</style>
