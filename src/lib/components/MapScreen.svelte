<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount, tick } from 'svelte';
	import MapView from './MapView.svelte';
	import SpotCard from './SpotCard.svelte';
	import FilterChips from './FilterChips.svelte';
	import { getTheme, swatchFor } from '#lib/theme.ts';
	import { availableSlices, resolveSlice, spotCategoryLabel, spotEmoji, spotsInSlice } from '#lib/slices.ts';
	import { shareLink } from '#lib/share.ts';
	import type { FoodMap, Spot } from '#lib/types.ts';

	type Props = {
		map: FoodMap;
		sliceSlug: string | null;
		spotSlug: string | null;
	};

	let { map, sliceSlug, spotSlug }: Props = $props();

	const theme = $derived(getTheme(map.profile.theme));
	const name = $derived(map.profile.displayName);
	const slice = $derived(sliceSlug ? resolveSlice(map, sliceSlug) : null);
	const visible = $derived(spotsInSlice(map.spots, slice));
	const openSpot = $derived(spotSlug ? (map.spots.find((s) => s.slug === spotSlug) ?? null) : null);
	const frame = $derived(openSpot ? [openSpot] : visible);
	const slices = $derived(availableSlices(map));

	let selectedId: string | null = $state(null);
	let focus: { id: string; nonce: number } | null = $state(null);
	let userLocation: { lat: number; lng: number } | null = $state(null);
	let mapReady = $state(false);
	let toast: string | null = $state(null);
	let rail: HTMLDivElement;

	// Keep the selection inside the visible set (a filter change may drop it).
	$effect(() => {
		if (openSpot) selectedId = openSpot.id;
		else if (!visible.some((s) => s.id === selectedId)) selectedId = visible[0]?.id ?? null;
	});

	function moveCamera(id: string) {
		focus = { id, nonce: (focus?.nonce ?? 0) + 1 };
	}

	// Pin tapped: select it and bring its card into view.
	async function selectFromMap(id: string) {
		selectedId = id;
		moveCamera(id);
		await tick();
		railScrolling = true;
		rail.querySelector(`[data-id="${id}"]`)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
		setTimeout(() => (railScrolling = false), 700);
	}

	// Card swiped into the centre by the user: follow it on the map.
	let railScrolling = false;
	let userTouchedRail = false;
	onMount(() => {
		// Cards come in after the pins, but never wait on a slow map for long.
		const fallback = setTimeout(() => (mapReady = true), 2000);
		const observer = new IntersectionObserver(
			(entries) => {
				const hit = entries.find((e) => e.isIntersecting);
				const id = (hit?.target as HTMLElement | undefined)?.dataset.id;
				if (!id || railScrolling || id === selectedId) return;
				selectedId = id;
				if (userTouchedRail) moveCamera(id);
			},
			{ root: rail, threshold: 0.7 }
		);
		const observe = () => rail.querySelectorAll('[data-id]').forEach((el) => observer.observe(el));
		observe();
		const mo = new MutationObserver(observe);
		mo.observe(rail, { childList: true });
		const touched = () => (userTouchedRail = true);
		rail.addEventListener('pointerdown', touched, { passive: true });
		rail.addEventListener('wheel', touched, { passive: true });
		return () => {
			clearTimeout(fallback);
			observer.disconnect();
			mo.disconnect();
			rail.removeEventListener('pointerdown', touched);
			rail.removeEventListener('wheel', touched);
		};
	});

	function pick(slug: string | null) {
		userTouchedRail = false;
		rail.scrollTo({ left: 0 });
		goto(slug ? `/${map.profile.handle}/${slug}` : `/${map.profile.handle}`, {
			replace: true,
			reset: false
		});
	}

	function flash(message: string) {
		toast = message;
		setTimeout(() => (toast = null), 2200);
	}

	async function share(title: string, text: string, path: string) {
		const result = await shareLink({ title, text, url: new URL(path, location.origin).href });
		if (result === 'copied') flash('Link copied');
		if (result === 'failed') flash("Couldn't share. Copy the address bar instead");
	}

	// The Share button shares whatever is on screen.
	function shareScreen() {
		const handle = map.profile.handle;
		if (openSpot) return shareSpot(openSpot);
		if (slice) {
			const title = `${name}'s ${slice.label} spots in Bangalore`;
			return share(title, `${title} · ${visible.length} spots`, `/${handle}/${slice.slug}`);
		}
		const title = `${name}'s Bangalore food map`;
		share(title, `${title} · ${map.spots.length} spots`, `/${handle}`);
	}

	function shareSpot(spot: Spot) {
		const title = `${spot.name}, ${spot.area}`;
		const text = spot.recommendation ? `${title}: ${spot.recommendation}` : `${title}, recommended by ${name}`;
		share(title, text, `/${map.profile.handle}/spot/${spot.slug}`);
	}

	function nearMe() {
		if (!navigator.geolocation) return flash('Location is not available on this device');
		navigator.geolocation.getCurrentPosition(
			(p) => (userLocation = { lat: p.coords.latitude, lng: p.coords.longitude }),
			() => flash('Location is off. You can still browse the map'),
			{ enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
		);
	}
</script>

<main class="fixed inset-0 overflow-hidden bg-[var(--map-land)]">
	<MapView
		{theme}
		spots={visible}
		{frame}
		emojiFor={(s) => spotEmoji(map, s)}
		{selectedId}
		{focus}
		{userLocation}
		onselect={selectFromMap}
		onready={() => (mapReady = true)}
	/>

	<!-- Header renders on the server, so something colourful shows before the map loads. -->
	<header class="pointer-events-none absolute inset-x-0 top-0 z-10 pt-[max(12px,env(safe-area-inset-top))]">
		<div class="pointer-events-auto flex items-center gap-2 px-4 pb-2">
			<div class="sticker flex min-w-0 items-center gap-2 rounded-full bg-surface py-1 pr-4 pl-1">
				{#if map.profile.avatarUrl}
					<img src={map.profile.avatarUrl} alt="" class="size-9 rounded-full border-2 border-ink object-cover" />
				{:else}
					<span class="grid size-9 place-items-center rounded-full border-2 border-ink bg-accent text-lg font-extrabold text-surface">
						{name.slice(0, 1).toUpperCase()}
					</span>
				{/if}
				<div class="min-w-0 leading-tight">
					<p class="truncate text-[17px] font-extrabold">
						{name}'s {slice ? slice.label : 'Bangalore'}
					</p>
					<p class="text-xs font-semibold opacity-70">
						{slice ? visible.length : map.spots.length} spots
					</p>
				</div>
			</div>
			<button
				type="button"
				onclick={shareScreen}
				class="sticker ml-auto flex-none rounded-full bg-sun px-4 py-2 text-[16px] font-extrabold active:translate-y-px"
			>
				Share ↗
			</button>
		</div>
		<div class="pointer-events-auto">
			<FilterChips {slices} total={map.spots.length} active={slice?.slug ?? null} onpick={pick} />
		</div>
	</header>

	<button
		type="button"
		onclick={nearMe}
		class="sticker absolute right-4 bottom-[calc(230px+env(safe-area-inset-bottom))] z-10 rounded-full bg-surface px-3 py-1.5 text-sm font-extrabold active:translate-y-px"
	>
		📍 Near me
	</button>

	<div
		bind:this={rail}
		class="rail no-scrollbar absolute inset-x-0 bottom-0 z-10 flex snap-x snap-mandatory gap-3 overflow-x-auto px-[9vw] pt-3 pb-[max(16px,env(safe-area-inset-bottom))]"
		class:ready={mapReady}
	>
		{#each visible as spot (spot.id)}
			<div data-id={spot.id} class="h-[200px] w-[82vw] max-w-[340px] flex-none snap-center">
				<SpotCard
					{spot}
					emoji={spotEmoji(map, spot)}
					label={spotCategoryLabel(map, spot)}
					swatch={swatchFor(theme, spot.category)}
					selected={spot.id === selectedId}
					onfocus={() => {
						selectedId = spot.id;
						moveCamera(spot.id);
					}}
					onshare={() => shareSpot(spot)}
				/>
			</div>
		{/each}
	</div>

	{#if toast}
		<div class="sticker absolute top-1/2 left-1/2 z-20 -translate-x-1/2 rounded-full bg-ink px-4 py-2 font-extrabold text-paper" role="status">
			{toast}
		</div>
	{/if}
</main>

<style>
	/* Cards rise in after the pins have popped. */
	.rail {
		transform: translateY(110%);
	}
	.rail.ready {
		animation: rise-in 520ms cubic-bezier(0.34, 1.3, 0.64, 1) 650ms both;
	}
	@media (min-width: 768px) {
		.rail {
			padding-left: 24px;
			padding-right: 24px;
		}
	}
</style>
