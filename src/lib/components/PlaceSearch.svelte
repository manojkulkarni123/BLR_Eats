<script lang="ts">
	import { onMount } from 'svelte';
	import {
		distanceM,
		foodNear,
		mergePlaces,
		searchKnown,
		searchPlaces,
		type Place
	} from '#lib/places.ts';
	import { supabase } from '#lib/supabase.ts';

	type Props = {
		onpick: (place: Place) => void;
		/** Bias results towards this point (the map's current view). */
		near?: { lat: number; lng: number };
		/** Show "Places around me" (GPS). `onhere` gets the position when the place isn't listed. */
		locate?: boolean;
		onhere?: (at: { lat: number; lng: number }) => void;
		placeholder?: string;
		autofocus?: boolean;
		/** Search for this text (e.g. a place from a pasted list that wasn't found). */
		seed?: string;
	};
	let {
		onpick,
		near,
		locate = false,
		onhere,
		placeholder = 'Search a place, or paste a Google Maps link',
		autofocus = true,
		seed = ''
	}: Props = $props();

	let query = $state('');
	let results: Place[] = $state([]);
	let loading = $state(false);
	let searched = $state(false);
	let message: string | null = $state(null);
	/** Set while showing places around the user's GPS position. */
	let here: { lat: number; lng: number } | null = $state(null);
	let input: HTMLInputElement;
	let timer: ReturnType<typeof setTimeout>;
	let controller: AbortController | null = null;

	onMount(() => {
		if (autofocus) input.focus();
	});

	$effect(() => {
		if (!seed) return;
		query = seed;
		input.focus();
		run();
	});

	// A Google Maps link (shared from the app or copied from the browser).
	const MAPS_LINK =
		/https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|(www\.)?google\.[a-z.]+\/maps|maps\.google\.)/i;

	async function fromLink(url: string, signal: AbortSignal): Promise<Place[]> {
		const res = await fetch('/api/place-link', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ url }),
			signal
		});
		if (res.ok) return [(await res.json()) as Place];
		message =
			((await res.json().catch(() => null)) as { message?: string } | null)?.message ?? null;
		return [];
	}

	function onInput() {
		here = null;
		clearTimeout(timer);
		timer = setTimeout(run, 250);
	}

	async function run() {
		controller?.abort();
		controller = new AbortController();
		loading = true;
		message = null;
		try {
			const { signal } = controller;
			if (MAPS_LINK.test(query)) {
				results = await fromLink(query.trim(), signal);
				searched = !message;
			} else {
				// Places on blr_eats maps are typo-tolerant; OSM fills in the rest.
				const [known, osm] = await Promise.all([
					searchKnown(supabase(), query, near).catch(() => []),
					searchPlaces(query, near, signal).catch((e) => {
						if (e instanceof DOMException && e.name === 'AbortError') throw e;
						return [];
					})
				]);
				results = mergePlaces(known, osm).slice(0, 10);
				searched = query.trim().length >= 2;
			}
		} catch (e) {
			if (!(e instanceof DOMException && e.name === 'AbortError')) results = [];
		} finally {
			loading = false;
		}
	}

	function aroundMe() {
		if (!navigator.geolocation) return (message = 'Location isn’t available on this device');
		loading = true;
		message = null;
		navigator.geolocation.getCurrentPosition(
			async (p) => {
				here = { lat: p.coords.latitude, lng: p.coords.longitude };
				query = '';
				searched = true;
				try {
					results = await foodNear(here);
				} catch {
					results = [];
				}
				loading = false;
				if (!results.length) message = 'No food places listed right around you.';
			},
			() => {
				loading = false;
				message = 'Location is off. Turn it on, or search by name';
			},
			{ enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
		);
	}

	function pick(place: Place) {
		onpick(place);
		query = '';
		results = [];
		searched = false;
		here = null;
		input.focus();
	}

	function metres(place: Place) {
		if (!here) return '';
		const m = distanceM(here, place);
		return m < 1000 ? `${Math.max(10, Math.round(m / 10) * 10)} m` : `${(m / 1000).toFixed(1)} km`;
	}
</script>

<div class="flex flex-col gap-2">
	<div class="sticker flex items-center gap-2 rounded-2xl bg-surface px-4 py-3">
		<span aria-hidden="true">🔎</span>
		<input
			bind:this={input}
			bind:value={query}
			oninput={onInput}
			{placeholder}
			enterkeyhint="search"
			autocomplete="off"
			class="min-w-0 flex-1 bg-transparent text-lg font-semibold outline-none"
		/>
		{#if loading}<span class="animate-spin text-lg" aria-label="Searching">◌</span>{/if}
	</div>

	{#if locate && !query.trim()}
		<button
			type="button"
			onclick={aroundMe}
			class="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink bg-surface py-2.5 font-extrabold"
		>
			📍 I’m here right now: show places around me
		</button>
	{/if}

	{#if here && results.length}
		<p class="px-1 text-sm font-extrabold opacity-60">Around you, nearest first</p>
	{/if}

	{#if results.length}
		<ul class="flex flex-col gap-1.5">
			{#each results as place (place.osmId)}
				<li>
					<button
						type="button"
						onclick={() => pick(place)}
						class="flex w-full items-center gap-3 rounded-2xl border-2 border-ink/15 bg-surface px-3 py-2 text-left active:bg-sun/40"
					>
						<span class="text-xl" aria-hidden="true">{place.isFood ? '🍽️' : '📍'}</span>
						<span class="min-w-0 flex-1">
							<span class="block truncate font-extrabold">{place.name}</span>
							<span class="block truncate text-sm font-semibold opacity-60"
								>{[
									metres(place),
									place.street,
									place.area,
									place.pinnedBy && `on ${place.pinnedBy} ${place.pinnedBy === 1 ? 'map' : 'maps'}`
								]
									.filter(Boolean)
									.join(' · ') || 'Bangalore'}</span
							>
						</span>
						<span class="font-extrabold">＋</span>
					</button>
				</li>
			{/each}
		</ul>
	{:else if searched && !loading && !here}
		<p class="px-1 font-semibold opacity-70">
			No match in Bangalore. Try a shorter name or the area too.
		</p>
	{/if}

	{#if message}<p class="px-1 font-semibold opacity-70" role="status">{message}</p>{/if}

	{#if here && onhere && !loading}
		<button
			type="button"
			onclick={() => here && onhere?.(here)}
			class="self-start font-extrabold underline"
		>
			Not listed? Pin my exact location
		</button>
	{/if}
</div>
