<script lang="ts">
	import { goto, refreshAll } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount, tick, untrack } from 'svelte';
	import MapView from './MapView.svelte';
	import SpotCard from './SpotCard.svelte';
	import FilterChips from './FilterChips.svelte';
	import SpotEditor from './SpotEditor.svelte';
	import TopSpotsSheet from './TopSpotsSheet.svelte';
	import SpotSheet from './SpotSheet.svelte';
	import ProfileSheet from './ProfileSheet.svelte';
	import ListsSheet from './ListsSheet.svelte';
	import AskPanel from './AskPanel.svelte';
	import AskThinking from './AskThinking.svelte';
	import { recordView } from '#lib/spots-client.ts';
	import InstagramIcon from './InstagramIcon.svelte';
	import { instagramUrl } from '#lib/instagram.ts';
	import { getTheme, swatchFor, themeCssVars } from '#lib/theme.ts';
	import { lookOf, posterPinMarkup } from '#lib/look.ts';
	import UiIcon from './UiIcon.svelte';
	import SpotCardPoster from './SpotCardPoster.svelte';
	import {
		availableSlices,
		resolveSlice,
		spotCategoryLabel,
		spotEmoji,
		spotsInSlice
	} from '#lib/slices.ts';
	import { shareLink } from '#lib/share.ts';
	import type { FoodMap, Spot } from '#lib/types.ts';

	type Me = { id: string; handle: string | null } | null;
	type Props = {
		map: FoodMap;
		me: Me;
		sliceSlug: string | null;
		spotSlug: string | null;
		/** View counts, only for the owner. */
		stats: { total: number; week: number } | null;
	};

	let { map, me, sliceSlug, spotSlug, stats }: Props = $props();

	const plural = (n: number, word: string) =>
		`${n === 1 ? '1' : compact(n)} ${word}${n === 1 ? '' : 's'}`;
	const compact = (n: number) =>
		n >= 1e6
			? `${(n / 1e6).toFixed(1)}M`
			: n >= 1e4
				? `${Math.round(n / 1e3)}k`
				: n >= 1e3
					? `${(n / 1e3).toFixed(1)}k`
					: `${n}`;

	// One screen for everyone (DECISIONS.md): the owner just gets a few more buttons.
	const isOwner = $derived(me?.id === map.profile.id);
	const theme = $derived(getTheme(map.profile.theme));
	const look = $derived(lookOf(theme));
	const name = $derived(map.profile.displayName);
	const possessive = $derived(`${name.split(' ')[0]}’s`);
	const handle = $derived(map.profile.handle);
	const slice = $derived(sliceSlug ? resolveSlice(map, sliceSlug) : null);
	// Viewer search narrows what's on screen: every word must match the name, area,
	// category or the recommendation itself ("filter coffee" finds spots whose tip says so).
	let query = $state('');
	const words = $derived(query.trim().toLowerCase().split(/\s+/).filter(Boolean));
	const inSlice = $derived(spotsInSlice(map.spots, slice));
	// "Ask this map": the AI's picks replace what's on screen until the visitor clears them.
	type Answer = { reply: string; picks: { id: string; why: string }[] };
	let answer = $state<Answer | null>(null);
	let asking = $state(false);
	let askOpen = $state(false);
	let askedQuestion = $state('');
	const askEnabled = $derived(Boolean((page.data as { askEnabled?: boolean }).askEnabled));
	const picked = $derived(
		answer
			? answer.picks
					.map((p) => map.spots.find((s) => s.id === p.id))
					.filter((s): s is Spot => Boolean(s))
			: null
	);
	const visible = $derived(
		askOpen && picked && picked.length
			? picked
			: words.length
				? inSlice.filter((s) => {
						const hay = [s.name, s.area, spotCategoryLabel(map, s), s.recommendation ?? '']
							.join(' ')
							.toLowerCase();
						return words.every((w) => hay.includes(w));
					})
				: inSlice
	);
	const openSpot = $derived(spotSlug ? (map.spots.find((s) => s.slug === spotSlug) ?? null) : null);
	// A shared spot link opens framed on that spot with its pop-up; after that the map frames what's visible.
	let directSlug: string | null = $state(untrack(() => spotSlug));
	const frame = $derived(openSpot && openSpot.slug === directSlug ? [openSpot] : visible);
	// The spot pop-up: opened from a card (a shallow history entry, so Back closes it) or a shared link.
	const sheetSpot = $derived(
		page.state.spot
			? (map.spots.find((s) => s.id === page.state.spot) ?? null)
			: openSpot && openSpot.slug === directSlug
				? openSpot
				: null
	);
	const slices = $derived(availableSlices(map));
	// "3 spots · 👀 1.2k views · your map ▾"
	const subtitle = $derived(
		[
			plural(slice || words.length ? visible.length : map.spots.length, 'spot'),
			stats && `👀 ${plural(stats.total, 'view')}`,
			// The owner's views already say "this is yours"; keep the line short enough for one row.
			isOwner && !stats ? 'your map ▾' : '▾'
		]
			.filter(Boolean)
			.join(' · ')
			.replace(' · ▾', ' ▾')
	);

	let selectedId: string | null = $state(null);
	let focus: { id: string; nonce: number } | null = $state(null);
	let userLocation: { lat: number; lng: number } | null = $state(null);
	let mapReady = $state(false);
	let toast: string | null = $state(null);
	let rail: HTMLDivElement;

	// Owner sheets.
	let editing: Spot | 'new' | null = $state(null);
	let addingTop = $state(false);
	/** Open the bulk sheet on "Paste a list" instead of search. */
	let pasteFirst = $state(false);
	let menuOpen = $state(false);
	let editingProfile = $state(false);
	let managingLists = $state(false);
	// Viewers tap the name chip to see who made the map.
	let aboutOpen = $state(false);
	let celebrate: number | null = $state(null);

	// Where the map is looking: biases place search, and is where a dropped pin lands.
	let viewCenter = $state({ lat: 12.9716, lng: 77.5946 });
	let picking: ((at: { lat: number; lng: number } | null) => void) | null = $state(null);

	function pickOnMap() {
		return new Promise<{ lat: number; lng: number } | null>((resolve) => {
			picking = (at) => {
				picking = null;
				resolve(at);
			};
		});
	}

	async function openSheet(spot: Spot) {
		selectedId = spot.id;
		await goto(page.url.href, { state: { spot: spot.id }, shallow: true });
		// After the pop-up is open, so the camera keeps the spot above it.
		moveCamera(spot.id);
	}

	function closeSheet() {
		if (page.state.spot) history.back();
		else {
			directSlug = null;
			goto(`/${handle}`, { replace: true, reset: false });
		}
	}

	// Viewers: the "Make your own map" button grows after they've browsed a few spots.
	// Plain Set on purpose: read only inside the effect below, never rendered.
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	const browsed = new Set<string>();
	let curious = $state(false);

	// Keep the selection inside the visible set (a filter change may drop it).
	$effect(() => {
		if (openSpot) selectedId = openSpot.id;
		else if (!visible.some((s) => s.id === selectedId)) selectedId = visible[0]?.id ?? null;
	});

	$effect(() => {
		if (selectedId) browsed.add(selectedId);
		if (browsed.size >= 3) curious = true;
	});

	function moveCamera(id: string) {
		focus = { id, nonce: (focus?.nonce ?? 0) + 1 };
	}

	async function scrollToCard(id: string) {
		await tick();
		railScrolling = true;
		rail
			.querySelector(`[data-id="${id}"]`)
			?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
		setTimeout(() => (railScrolling = false), 700);
	}

	// Pin tapped: select it and bring its card into view.
	function selectFromMap(id: string) {
		selectedId = id;
		moveCamera(id);
		scrollToCard(id);
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

		// Count this visit once per browser session (the database ignores the owner's own visits).
		if (!isOwner && handle !== 'demo') {
			const key = `viewed:${handle}`;
			try {
				if (!sessionStorage.getItem(key)) {
					sessionStorage.setItem(key, '1');
					recordView(handle);
				}
			} catch {
				recordView(handle);
			}
		}

		// Fresh map from /welcome: open "Add your top spots" straight away.
		if (page.url.searchParams.get('add') === 'top') {
			if (isOwner) addingTop = true;
			goto(page.url.pathname, { replace: true, reset: false });
		}

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
		goto(slug ? `/${handle}/${slug}` : `/${handle}`, { replace: true, reset: false });
	}

	function openAsk() {
		askOpen = true;
		menuOpen = false;
		aboutOpen = false;
	}

	function closeAsk() {
		askOpen = false;
		answer = null;
	}

	async function ask(question: string) {
		if (asking) return;
		asking = true;
		answer = null;
		askedQuestion = question;
		try {
			const res = await fetch('/api/ask', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ handle, question })
			});
			const body = await res.json().catch(() => null);
			if (!res.ok) return flash(body?.message ?? 'Couldn’t ask right now. Try again');
			answer = body as Answer;
			userTouchedRail = false;
			rail.scrollTo({ left: 0 });
		} catch {
			flash('Couldn’t ask right now. Check your connection');
		} finally {
			asking = false;
		}
	}

	function flash(message: string) {
		toast = message;
		setTimeout(() => (toast = null), 2200);
	}

	async function share(title: string, text: string, path: string) {
		const result = await shareLink({ title, text, url: new URL(path, location.origin).href });
		if (result === 'copied') flash('Link copied');
		if (result === 'failed') flash('Couldn’t share. Copy the address bar instead');
	}

	// The Share button shares whatever is on screen.
	function shareScreen() {
		if (sheetSpot) return shareSpot(sheetSpot);
		if (slice) {
			const title = `${name}'s ${slice.label} spots in Bangalore`;
			return share(title, `${title} · ${visible.length} spots`, `/${handle}/${slice.slug}`);
		}
		const title = `${name}'s Bangalore food map`;
		share(title, `${title} · ${map.spots.length} spots`, `/${handle}`);
	}

	function shareSpot(spot: Spot) {
		const title = `${spot.name}, ${spot.area}`;
		const text = spot.recommendation
			? `${title}: ${spot.recommendation}`
			: `${title}, recommended by ${name}`;
		share(title, text, `/${handle}/spot/${spot.slug}`);
	}

	function nearMe() {
		if (!navigator.geolocation) return flash('Location is not available on this device');
		navigator.geolocation.getCurrentPosition(
			(p) => (userLocation = { lat: p.coords.latitude, lng: p.coords.longitude }),
			() => flash('Location is off. You can still browse the map'),
			{ enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
		);
	}

	async function afterEdit(result: { savedId?: string; deleted?: boolean }) {
		const wasNew = editing === 'new';
		await refreshAll();
		editing = null;
		if (result.deleted) return flash('Removed');
		if (result.savedId) {
			const id = result.savedId;
			if (slice && !visible.some((s) => s.id === id))
				await goto(`/${handle}`, { replace: true, reset: false });
			selectedId = id;
			moveCamera(id);
			scrollToCard(id);
			flash(wasNew ? `Spot #${map.spots.length} added 🎉` : 'Saved');
		}
	}

	async function afterTop(added: number) {
		await refreshAll();
		addingTop = false;
		if (added) celebrate = map.spots.length;
	}
</script>

<div class={look === 'poster' ? 'look-poster contents' : 'contents'} style={themeCssVars(theme)}>
	<main class="fixed inset-0 overflow-hidden bg-[var(--map-land)]" class:grain={look === 'poster'}>
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
			onmove={(c) => (viewCenter = c)}
			sheetOpen={!!sheetSpot}
			pinMarkup={look === 'poster' ? (s) => posterPinMarkup(theme, s) : undefined}
		/>

		<!-- Header renders on the server, so something colourful shows before the map loads. -->
		<header
			class="pointer-events-none absolute inset-x-0 top-0 z-10 pt-[max(12px,env(safe-area-inset-top))]"
		>
			<div class="pointer-events-auto flex items-center gap-2 px-4 pb-2">
				{#if look === 'poster'}
					<button
						type="button"
						class="flex min-w-0 items-center gap-2.5 rounded-[22px] border-2 border-ink bg-surface py-1.5 pr-4 pl-1.5 text-left shadow-[3px_3px_0_var(--ink)]"
						onclick={() => (isOwner ? (menuOpen = !menuOpen) : (aboutOpen = !aboutOpen))}
						aria-expanded={isOwner ? menuOpen : aboutOpen}
					>
						{#if map.profile.avatarUrl}
							<img
								src={map.profile.avatarUrl}
								alt=""
								class="size-11 flex-none rounded-full border-2 border-ink object-cover"
							/>
						{:else}
							<span
								class="title grid size-11 flex-none place-items-center rounded-full border-2 border-ink bg-accent text-xl font-extrabold text-surface"
							>
								{name.slice(0, 1).toUpperCase()}
							</span>
						{/if}
						<span class="min-w-0 leading-none">
							<span class="block text-[11px] font-extrabold tracking-[0.14em] uppercase"
								>{possessive}</span
							>
							<span class="title block truncate text-[27px] leading-[0.95] font-extrabold">
								{slice ? slice.label : 'Bengaluru'}
							</span>
							<span class="mt-1 block text-xs font-semibold opacity-70">{subtitle}</span>
						</span>
					</button>
				{:else}
					<button
						type="button"
						class="sticker flex min-w-0 items-center gap-2 rounded-full bg-surface py-1 pr-4 pl-1 text-left"
						onclick={() => (isOwner ? (menuOpen = !menuOpen) : (aboutOpen = !aboutOpen))}
						aria-expanded={isOwner ? menuOpen : aboutOpen}
					>
						{#if map.profile.avatarUrl}
							<img
								src={map.profile.avatarUrl}
								alt=""
								class="size-9 rounded-full border-2 border-ink object-cover"
							/>
						{:else}
							<span
								class="grid size-9 flex-none place-items-center rounded-full border-2 border-ink bg-accent text-lg font-extrabold text-surface"
							>
								{name.slice(0, 1).toUpperCase()}
							</span>
						{/if}
						<span class="min-w-0 leading-tight">
							<span class="block truncate text-[17px] font-extrabold">
								{name}'s {slice ? slice.label : 'Bangalore'}
							</span>
							<span class="block text-xs font-semibold opacity-70">
								{subtitle}
							</span>
						</span>
					</button>
				{/if}
				{#if map.profile.instagram}
					<a
						href={instagramUrl(map.profile.instagram)}
						target="_blank"
						rel="noopener noreferrer"
						aria-label="{name} on Instagram"
						title="@{map.profile.instagram} on Instagram"
						class="sticker ig ml-auto grid size-11 flex-none place-items-center rounded-full text-surface active:translate-y-px"
					>
						<InstagramIcon class="size-6" />
					</a>
				{/if}
				{#if map.spots.length}
					{#if look === 'poster'}
						<button
							type="button"
							onclick={shareScreen}
							aria-label="Share"
							class="grid size-11 flex-none place-items-center rounded-full border-2 border-ink bg-ink text-paper active:translate-y-px"
							class:ml-auto={!map.profile.instagram}
						>
							<UiIcon name="share" size={20} />
						</button>
					{:else}
						<button
							type="button"
							onclick={shareScreen}
							class="sticker flex flex-none items-center gap-1.5 rounded-full bg-sun px-4 py-2 text-[16px] font-extrabold active:translate-y-px"
							class:ml-auto={!map.profile.instagram}
						>
							Share <UiIcon name="share" size={18} />
						</button>
					{/if}
				{/if}
			</div>

			{#if menuOpen && isOwner}
				<div
					class="pointer-events-auto mx-4 mb-2 flex w-60 flex-col overflow-hidden rounded-2xl border-[2.5px] border-ink bg-surface shadow-[3px_3px_0_var(--ink)]"
				>
					<button
						type="button"
						class="menu-item"
						onclick={() => ((menuOpen = false), (pasteFirst = false), (addingTop = true))}
					>
						⚡ Add several spots
					</button>
					<button
						type="button"
						class="menu-item"
						onclick={() => ((menuOpen = false), (pasteFirst = true), (addingTop = true))}
					>
						📋 Paste a list
					</button>
					<button
						type="button"
						class="menu-item"
						onclick={() => ((menuOpen = false), (editing = 'new'))}
					>
						＋ Add one spot
					</button>
					<button
						type="button"
						class="menu-item"
						onclick={() => ((menuOpen = false), (editingProfile = true))}
					>
						✏️ Edit profile & Instagram
					</button>
					<button
						type="button"
						class="menu-item"
						onclick={() => ((menuOpen = false), (managingLists = true))}
					>
						⭐ Your lists
					</button>
					{#if stats}
						<p class="menu-item opacity-70">
							👀 {stats.total.toLocaleString('en-IN')} views · {stats.week.toLocaleString('en-IN')} this
							week
						</p>
					{/if}
					<form method="POST" action="/signout">
						<button class="menu-item w-full">👋 Sign out</button>
					</form>
				</div>
			{/if}

			{#if aboutOpen && !isOwner}
				<div
					class="sticker pointer-events-auto mx-4 mb-2 flex max-w-sm items-center gap-3 rounded-3xl bg-surface p-3"
				>
					{#if map.profile.avatarUrl}
						<img
							src={map.profile.avatarUrl}
							alt=""
							class="size-16 rounded-full border-2 border-ink object-cover"
						/>
					{:else}
						<span
							class="grid size-16 flex-none place-items-center rounded-full border-2 border-ink bg-accent text-2xl font-extrabold text-surface"
							>{name.slice(0, 1).toUpperCase()}</span
						>
					{/if}
					<div class="min-w-0 flex-1">
						<p class="truncate text-lg font-extrabold">{name}</p>
						{#if map.profile.bio}<p class="text-sm leading-snug font-semibold opacity-80">
								{map.profile.bio}
							</p>{/if}
						<p class="mt-0.5 text-xs font-extrabold opacity-60">
							{map.spots.length} spots in Bangalore
						</p>
					</div>
					{#if map.profile.instagram}
						<a
							href={instagramUrl(map.profile.instagram)}
							target="_blank"
							rel="noopener noreferrer"
							class="sticker ig flex-none rounded-full px-3 py-1.5 text-sm font-extrabold text-surface"
							>Follow</a
						>
					{/if}
				</div>
			{/if}

			{#if askOpen}
				<div class="pointer-events-auto">
					<AskPanel
						owner={name}
						initial={query}
						{asking}
						answered={Boolean(answer)}
						onask={ask}
						onclose={closeAsk}
						{look}
					/>
				</div>
			{:else if map.spots.length}
				<div class="pointer-events-auto">
					<FilterChips
						{slices}
						total={map.spots.length}
						active={slice?.slug ?? null}
						onpick={pick}
						{query}
						onquery={(q) => (query = q)}
						onaskopen={askEnabled && map.spots.length >= 2 ? openAsk : undefined}
						{look}
						{theme}
					/>
				</div>
			{/if}
		</header>

		{#if askOpen && asking}
			<div
				class="sticker pointer-events-auto absolute inset-x-4 top-[calc(150px+env(safe-area-inset-top))] z-10 mx-auto max-w-md rounded-3xl bg-surface p-4"
			>
				<p class="mb-3 truncate text-sm font-extrabold opacity-60">“{askedQuestion}”</p>
				<AskThinking owner={name} {look} {theme} />
			</div>
		{/if}

		{#if askOpen && answer}
			<div
				class="sticker answer pointer-events-auto absolute inset-x-4 top-[calc(150px+env(safe-area-inset-top))] z-10 mx-auto max-h-[calc(100dvh-420px)] max-w-md overflow-y-auto rounded-3xl bg-surface p-4"
				role="status"
			>
				<p class="mb-1 truncate text-sm font-extrabold opacity-60">“{askedQuestion}”</p>
				<div class="flex items-start gap-2">
					<p class="flex-1 text-[15px] leading-snug font-semibold">
						{#if look === 'pop'}✨{/if}
						{answer.reply}
					</p>
					<button
						type="button"
						aria-label="Clear the answer"
						class="-mt-1 px-1 text-lg font-extrabold opacity-50"
						onclick={() => (answer = null)}>✕</button
					>
				</div>
				{#if picked?.length}
					<ol class="mt-2 flex flex-col gap-1.5">
						{#each answer.picks as pick, i (pick.id)}
							{@const spot = map.spots.find((s) => s.id === pick.id)}
							{#if spot}
								<li>
									<button
										type="button"
										class="flex w-full items-start gap-2 rounded-2xl bg-paper px-3 py-2 text-left"
										onclick={() => openSheet(spot)}
									>
										<span class="font-extrabold">{i + 1}.</span>
										<span class="min-w-0 flex-1 leading-snug">
											<span class="block font-extrabold">{spotEmoji(map, spot)} {spot.name}</span>
											<span class="block text-sm font-semibold opacity-75">{pick.why}</span>
										</span>
									</button>
								</li>
							{/if}
						{/each}
					</ol>
				{/if}
				<p class="mt-2 text-xs font-semibold opacity-50">AI picks from {name}'s spots and tips.</p>
			</div>
		{/if}

		{#if map.spots.length === 0}
			<div class="absolute inset-x-6 top-1/2 z-10 mx-auto max-w-sm -translate-y-1/2">
				<div class="sticker rounded-3xl bg-surface p-6 text-center">
					<p class="text-5xl">🗺️</p>
					{#if isOwner}
						<h2 class="mt-2 text-2xl leading-tight font-extrabold">Your map is waiting</h2>
						<p class="mt-1 font-semibold opacity-75">
							Add your go-to places. It takes about two minutes.
						</p>
						<button
							type="button"
							onclick={() => ((pasteFirst = false), (addingTop = true))}
							class="sticker mt-4 w-full rounded-full bg-sun py-3 text-lg font-extrabold"
						>
							Add your top spots →
						</button>
						<button
							type="button"
							onclick={() => ((pasteFirst = true), (addingTop = true))}
							class="mt-3 font-extrabold underline"
						>
							Got a list in WhatsApp or Notes? Paste it
						</button>
					{:else}
						<h2 class="mt-2 text-2xl leading-tight font-extrabold">
							{name} hasn't pinned anything yet
						</h2>
						<p class="mt-1 font-semibold opacity-75">Check back soon.</p>
					{/if}
				</div>
			</div>
		{/if}

		<div
			class="absolute right-4 bottom-[calc(228px+env(safe-area-inset-bottom))] left-4 z-10 flex items-end justify-between gap-2"
			class:hidden={map.spots.length === 0}
		>
			{#if isOwner}
				<button
					type="button"
					onclick={() => (editing = 'new')}
					class="sticker flex items-center gap-1.5 rounded-full px-4 py-2 font-extrabold active:translate-y-px"
					class:bg-accent={look === 'pop'}
					class:text-surface={look === 'pop'}
					class:bg-ink={look === 'poster'}
					class:text-paper={look === 'poster'}
				>
					<UiIcon name="add" size={18} /> Add spot
				</button>
			{:else}
				<a
					href={me?.handle ? `/${me.handle}` : '/'}
					class="sticker cta rounded-full font-extrabold"
					class:curious
					class:bg-accent={look === 'pop'}
					class:text-surface={look === 'pop'}
					class:bg-ink={look === 'poster'}
					class:text-paper={look === 'poster'}
				>
					{#if look === 'poster'}
						{me?.handle ? 'My map' : 'Make your own map'}
					{:else}
						{me?.handle ? '🗺️ My map' : '✨ Make your own map'}
					{/if}
				</a>
			{/if}
			<button
				type="button"
				onclick={nearMe}
				class="sticker flex items-center gap-1 rounded-full bg-surface px-3 py-1.5 text-sm font-extrabold active:translate-y-px"
			>
				<UiIcon name="near" size={16} /> Near me
			</button>
		</div>

		<div
			bind:this={rail}
			class="rail no-scrollbar absolute inset-x-0 bottom-0 z-10 flex snap-x snap-mandatory gap-3 overflow-x-auto px-[9vw] pt-3 pb-[max(16px,env(safe-area-inset-bottom))]"
			class:ready={mapReady}
		>
			{#each visible as spot (spot.id)}
				<div data-id={spot.id} class="h-[200px] w-[82vw] max-w-[340px] flex-none snap-center">
					{#if look === 'poster'}
						<SpotCardPoster
							{spot}
							label={spotCategoryLabel(map, spot)}
							{theme}
							selected={spot.id === selectedId}
							onfocus={() => openSheet(spot)}
							onshare={() => shareSpot(spot)}
							onedit={isOwner ? () => (editing = spot) : undefined}
						/>
					{:else}
						<SpotCard
							{spot}
							emoji={spotEmoji(map, spot)}
							label={spotCategoryLabel(map, spot)}
							swatch={swatchFor(theme, spot.category)}
							selected={spot.id === selectedId}
							onfocus={() => openSheet(spot)}
							onshare={() => shareSpot(spot)}
							onedit={isOwner ? () => (editing = spot) : undefined}
						/>
					{/if}
				</div>
			{/each}
			{#if words.length && visible.length === 0}
				<div class="h-[200px] w-[82vw] max-w-[340px] flex-none snap-center">
					<div
						class="sticker grid h-full place-items-center rounded-3xl bg-surface p-6 text-center"
					>
						<div class="text-lg font-extrabold">
							<p>Nothing matches “{query.trim()}”.</p>
							{#if askEnabled}
								<button
									type="button"
									onclick={openAsk}
									class="sticker mt-3 rounded-full bg-accent px-4 py-2 text-base text-surface"
									>✨ Ask the map instead</button
								>
							{:else}
								<p class="font-semibold opacity-70">Try a dish, an area or a cuisine.</p>
							{/if}
						</div>
					</div>
				</div>
			{/if}
		</div>

		{#if picking}
			<!-- Drop a pin: move the map under the fixed pin, then confirm. -->
			<div class="pointer-events-none absolute inset-0 z-30">
				<div
					class="sticker pointer-events-auto absolute inset-x-4 top-[max(16px,env(safe-area-inset-top))] rounded-2xl bg-surface px-4 py-3 text-center font-extrabold"
				>
					Move the map so the pin sits on the place
				</div>
				<span
					class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full text-5xl drop-shadow-[3px_3px_0_var(--ink)]"
					aria-hidden="true">📍</span
				>
				<div
					class="pointer-events-auto absolute inset-x-4 bottom-[max(16px,env(safe-area-inset-bottom))] flex gap-2"
				>
					<button
						type="button"
						onclick={() => picking?.(null)}
						class="sticker rounded-full bg-surface px-5 py-3 font-extrabold">Cancel</button
					>
					<button
						type="button"
						onclick={() => picking?.(viewCenter)}
						class="sticker flex-1 rounded-full bg-sun py-3 text-lg font-extrabold"
						>Pin it here</button
					>
				</div>
			</div>
		{/if}

		{#if celebrate !== null}
			<div class="absolute inset-x-6 top-1/2 z-20 mx-auto max-w-sm -translate-y-1/2">
				<div class="sticker celebrate rounded-3xl bg-sun p-6 text-center">
					<p class="text-5xl">🎉</p>
					<h2 class="mt-2 text-3xl leading-none font-extrabold">Your map has {celebrate} spots</h2>
					<p class="mt-2 font-semibold">
						Looks good, right? Send it to someone who keeps asking where to eat.
					</p>
					<button
						type="button"
						onclick={() => ((celebrate = null), shareScreen())}
						class="sticker mt-4 w-full rounded-full bg-ink py-3 text-lg font-extrabold text-paper"
					>
						Share my map ↗
					</button>
					<button
						type="button"
						class="mt-3 font-extrabold underline"
						onclick={() => (celebrate = null)}
					>
						Look around first
					</button>
				</div>
			</div>
		{/if}

		{#if toast}
			<div
				class="sticker absolute top-1/2 left-1/2 z-40 -translate-x-1/2 rounded-full bg-ink px-4 py-2 font-extrabold whitespace-nowrap text-paper"
				role="status"
			>
				{toast}
			</div>
		{/if}
	</main>

	{#if sheetSpot}
		{@const spot = sheetSpot}
		<SpotSheet
			{spot}
			emoji={spotEmoji(map, spot)}
			label={spotCategoryLabel(map, spot)}
			swatch={swatchFor(theme, spot.category)}
			{look}
			{theme}
			recommendedBy={name}
			instagram={map.profile.instagram}
			lists={map.lists.filter((l) => l.spotIds.includes(spot.id))}
			{handle}
			onclose={closeSheet}
			onshare={() => shareSpot(spot)}
			onedit={isOwner
				? () => {
						closeSheet();
						editing = spot;
					}
				: undefined}
		/>
	{/if}
	{#if isOwner && me && editing}
		<!-- Kept mounted (just hidden) while dropping a pin, so the form keeps its state. -->
		<div class:hidden={picking}>
			<SpotEditor
				{map}
				ownerId={me.id}
				spot={editing === 'new' ? null : editing}
				near={viewCenter}
				onpickonmap={pickOnMap}
				onclose={() => (editing = null)}
				ondone={afterEdit}
			/>
		</div>
	{/if}
	{#if isOwner && me && managingLists}
		<ListsSheet
			ownerId={me.id}
			{handle}
			lists={map.lists}
			onclose={() => (managingLists = false)}
			onchange={() => refreshAll()}
		/>
	{/if}
	{#if isOwner && editingProfile}
		<ProfileSheet
			profile={map.profile}
			onclose={() => (editingProfile = false)}
			ondone={async () => {
				await refreshAll();
				editingProfile = false;
				flash('Profile saved');
			}}
		/>
	{/if}
	{#if isOwner && me && addingTop}
		<TopSpotsSheet
			{map}
			ownerId={me.id}
			near={viewCenter}
			paste={pasteFirst}
			onclose={() => (addingTop = false)}
			ondone={afterTop}
		/>
	{/if}
</div>

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
	.menu-item {
		padding: 0.7rem 1rem;
		text-align: left;
		font-weight: 800;
		border-bottom: 2px solid color-mix(in srgb, var(--ink) 10%, transparent);
	}
	.cta {
		padding: 0.35rem 0.8rem;
		font-size: 14px;
		transition:
			padding 300ms cubic-bezier(0.34, 1.56, 0.64, 1),
			font-size 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	.cta.curious {
		padding: 0.55rem 1.1rem;
		font-size: 17px;
	}
	/* Instagram's own warm gradient, so the button reads as Instagram at a glance. */
	.ig {
		background: linear-gradient(45deg, #feda75, #fa7e1e 30%, #d62976 60%, #962fbf 85%, #4f5bd5);
	}
	.answer {
		animation: rise 260ms cubic-bezier(0.34, 1.3, 0.64, 1) both;
	}
	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(8px) scale(0.98);
		}
	}
	.celebrate {
		animation: pop-in 480ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
	}
</style>
