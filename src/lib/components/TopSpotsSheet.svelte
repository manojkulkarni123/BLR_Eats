<script lang="ts">
	import { untrack } from 'svelte';
	import Sheet from './Sheet.svelte';
	import PlaceSearch from './PlaceSearch.svelte';
	import CategoryPicker from './CategoryPicker.svelte';
	import AskThinking from './AskThinking.svelte';
	import VoiceButton from './VoiceButton.svelte';
	import { categoryByKey, type CategoryKey } from '#lib/categories.ts';
	import { lookOf } from '#lib/look.ts';
	import type { Place } from '#lib/places.ts';
	import { createCustomCategory, createSpots } from '#lib/spots-client.ts';
	import { getTheme } from '#lib/theme.ts';
	import { screenshotForAi } from '#lib/image.ts';
	import type { FoodMap } from '#lib/types.ts';

	// Adding several places at once. "Tell us your spots" (the default): type like you'd
	// text a friend, or paste a list or Google Maps links, then check what we matched.
	// Or search one by one. Photos can come later (DECISIONS.md, "Key flows").
	type Props = {
		map: FoodMap;
		ownerId: string;
		onclose: () => void;
		ondone: (added: number) => Promise<void>;
		near?: { lat: number; lng: number };
		/** Which tab to open on: "Tell us your spots" (default) or search. */
		start?: 'tell' | 'search';
	};
	let { map, ownerId, onclose, ondone, near, start = 'tell' }: Props = $props();

	type Item = Place & {
		category: CategoryKey | null;
		customCategoryId: string | null;
		tip: string;
		/** From a pasted list: what they wrote, and other candidates to swap to. */
		wrote?: string;
		alternatives?: Place[];
	};
	type Parsed = {
		wrote: string;
		tip: string;
		category: CategoryKey | null;
		match: Place | null;
		alternatives: Place[];
	};

	let mode: 'search' | 'paste' = $state(untrack(() => (start === 'tell' ? 'paste' : 'search')));
	let items: Item[] = $state([]);
	let open: string | null = $state(null);
	let swapping: string | null = $state(null);
	let busy = $state(false);
	let error: string | null = $state(null);
	let customCategories = $state(untrack(() => [...map.customCategories]));

	let text = $state('');
	let reading = $state(false);
	/** Lines from the pasted list we couldn't place; each can be searched for. */
	let missing: Parsed[] = $state([]);
	let seed = $state('');
	/** What was being looked up from `missing` when the search was seeded. */
	let seeking: Parsed | null = null;
	/** Screenshots to read (Zomato pages, Instagram stories…), shrunk, as data URLs. */
	const MAX_SHOTS = 5;
	let shots: string[] = $state([]);
	let readingShots = $state(false);

	async function addShots(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const files = [...(input.files ?? [])].slice(0, MAX_SHOTS - shots.length);
		input.value = '';
		if (!files.length) return;
		readingShots = true;
		error = null;
		try {
			const urls = await Promise.all(files.map(screenshotForAi));
			shots = [...shots, ...urls].slice(0, MAX_SHOTS);
		} catch {
			error = 'Couldn’t open that image. Try a screenshot';
		} finally {
			readingShots = false;
		}
	}

	function heard(said: string) {
		text = text.trim() ? `${text.trim()}\n${said}` : said;
	}

	const ready = $derived(text.trim().length >= 3 || shots.length > 0);

	// A casual message, not a tidy list: it shows people they can just write.
	const EXAMPLE =
		'CTR in Malleshwaram for benne dosa, Meghana Koramangala for the boneless biryani, and Toit when you want beers…\n\nOr paste a list or Google Maps links.';
	const theme = $derived(getTheme(map.profile.theme));
	const owned = untrack(() => new Set(map.spots.map((s) => s.name.toLowerCase())));

	function toItem(p: Place, extra: Partial<Item> = {}): Item {
		return { ...p, category: p.suggestedCategory, customCategoryId: null, tip: '', ...extra };
	}

	function add(p: Place) {
		if (items.some((i) => i.osmId === p.osmId)) return;
		// Found by hand from the "couldn't find" list: keep the tip they wrote.
		const from = seeking;
		const item = toItem(
			p,
			from
				? { tip: from.tip, wrote: from.wrote, category: from.category ?? p.suggestedCategory }
				: {}
		);
		items = [item, ...items];
		if (from) missing = missing.filter((m) => m !== from);
		seeking = null;
		seed = '';
		// Ask for a category right away only when we couldn't guess one.
		open = item.category ? null : p.osmId;
	}

	async function readList() {
		if (!ready) return;
		reading = true;
		error = null;
		try {
			const res = await fetch('/api/parse-list', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text, images: shots })
			});
			const body = (await res.json().catch(() => ({}))) as { items?: Parsed[]; message?: string };
			if (!res.ok || !body.items) throw new Error(body.message ?? 'Couldn’t read that list');
			const found: Item[] = [];
			const lost: Parsed[] = [];
			for (const p of body.items) {
				if (!p.match) {
					lost.push(p);
					continue;
				}
				if (
					items.some((i) => i.osmId === p.match!.osmId) ||
					found.some((i) => i.osmId === p.match!.osmId)
				)
					continue;
				found.push(
					toItem(p.match, {
						category: p.category ?? p.match.suggestedCategory,
						tip: p.tip,
						wrote: p.wrote,
						alternatives: p.alternatives
					})
				);
			}
			if (!found.length && !lost.length) throw new Error('We couldn’t spot any places in that');
			items = [...found.reverse(), ...items];
			missing = lost;
			text = '';
			shots = [];
			mode = 'search';
		} catch (e) {
			error = e instanceof Error ? e.message : 'Couldn’t read that list';
		} finally {
			reading = false;
		}
	}

	function swap(item: Item, to: Place) {
		const others = [item as Place, ...(item.alternatives ?? [])].filter(
			(p) => p.osmId !== to.osmId
		);
		const i = items.findIndex((x) => x.osmId === item.osmId);
		items[i] = {
			...item,
			...to,
			category: item.category ?? to.suggestedCategory,
			alternatives: others.map((o) => ({ ...o }))
		};
		swapping = null;
	}

	function find(line: Parsed) {
		seeking = line;
		// "Meghana, Koramangala" searches better as "Meghana Koramangala".
		seed = line.wrote.replace(/,/g, ' ');
	}

	function label(item: Item) {
		if (item.category)
			return `${categoryByKey[item.category].emoji} ${categoryByKey[item.category].label}`;
		const c = customCategories.find((c) => c.id === item.customCategoryId);
		return c ? `${c.emoji} ${c.name}` : 'Pick a type';
	}

	async function newCategory(name: string, emoji: string) {
		const id = await createCustomCategory(ownerId, name, emoji);
		customCategories = [...customCategories, { id, name, slug: '', emoji }];
		return id;
	}

	async function finish() {
		if (!items.length) return onclose();
		busy = true;
		error = null;
		try {
			await createSpots(
				ownerId,
				[...items].reverse().map((i) => ({
					name: i.name,
					lat: i.lat,
					lng: i.lng,
					area: i.area,
					address: i.street,
					category: i.category,
					customCategoryId: i.customCategoryId,
					recommendation: i.tip.trim() || null,
					reelUrl: null,
					osmId: i.osmId
				})),
				map.spots
			);
			await ondone(items.length);
		} catch {
			error = 'Couldn’t save. Check your connection and try again';
			busy = false;
		}
	}
</script>

<Sheet
	title={mode === 'paste'
		? 'Tell us your spots'
		: map.spots.length
			? 'Search and add'
			: 'Add your top spots'}
	{onclose}
>
	<div
		class="mb-3 grid grid-cols-2 gap-1 rounded-full border-2 border-ink bg-surface p-1"
		role="tablist"
	>
		<button
			type="button"
			role="tab"
			aria-selected={mode === 'paste'}
			class="tab rounded-full py-1.5 font-extrabold"
			onclick={() => (mode = 'paste')}>💬 Tell us</button
		>
		<button
			type="button"
			role="tab"
			aria-selected={mode === 'search'}
			class="tab rounded-full py-1.5 font-extrabold"
			onclick={() => (mode = 'search')}>🔎 Search</button
		>
	</div>

	{#if mode === 'paste'}
		{#if reading}
			<div class="sticker rounded-2xl bg-surface p-4">
				<AskThinking
					look={lookOf(theme)}
					{theme}
					steps={[
						...(shots.length ? ['Reading your screenshots…'] : []),
						'Reading what you wrote…',
						'Finding each place on the map…',
						'Checking which branch…',
						'Pulling out your tips…',
						'Almost there…'
					]}
				/>
			</div>
		{:else}
			<p class="mb-2 font-semibold opacity-80">
				Type it like you’d text a friend, say it, or paste a list. Names, areas, what to order,
				Google Maps links and screenshots all work.
			</p>
			<textarea
				bind:value={text}
				rows="7"
				maxlength="4000"
				placeholder={EXAMPLE}
				class="sticker w-full resize-none rounded-2xl bg-surface px-4 py-3 text-base font-semibold outline-none"
			></textarea>
			<div class="mt-2 flex gap-2">
				<VoiceButton ontext={heard} onerror={(m) => (error = m)} />
				<label
					class="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full border-2 border-ink bg-surface py-2 font-extrabold"
					class:opacity-50={shots.length >= MAX_SHOTS}
				>
					{readingShots ? 'Adding…' : '📷 Screenshots'}
					<input
						type="file"
						accept="image/*"
						multiple
						class="sr-only"
						disabled={shots.length >= MAX_SHOTS || readingShots}
						onchange={addShots}
					/>
				</label>
			</div>
			{#if shots.length}
				<ul class="mt-2 flex gap-2 overflow-x-auto pb-1" aria-label="Screenshots to read">
					{#each shots as shot, i (shot)}
						<li class="relative shrink-0">
							<img
								src={shot}
								alt="Screenshot {i + 1}"
								class="h-20 w-12 rounded-lg border-2 border-ink object-cover"
							/>
							<button
								type="button"
								aria-label="Remove screenshot {i + 1}"
								class="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full border-2 border-ink bg-surface text-xs font-extrabold"
								onclick={() => (shots = shots.filter((_, j) => j !== i))}>✕</button
							>
						</li>
					{/each}
				</ul>
			{/if}
			<p class="mt-1.5 text-xs font-semibold opacity-55">
				Screenshots are only read to find the places, never saved.
			</p>
			{#if error}<p class="mt-2 font-extrabold text-accent" role="alert">{error}</p>{/if}
			<button
				type="button"
				disabled={!ready}
				onclick={readList}
				class="sticker mt-2 w-full rounded-full bg-ink py-2.5 text-lg font-extrabold text-surface disabled:opacity-40"
			>
				Pin them →
			</button>
		{/if}
	{:else}
		<p class="mb-3 font-semibold opacity-80">
			Your go-to places. Type a name, tap it, next one. Photos and tips can come later.
		</p>
		<PlaceSearch onpick={add} {near} {seed} autofocus={!items.length} />
	{/if}

	{#if missing.length}
		<div class="mt-4 rounded-2xl border-2 border-dashed border-ink bg-sun/30 p-3">
			<p class="font-extrabold">Couldn’t find {missing.length === 1 ? 'this one' : 'these'}</p>
			<ul class="mt-1 flex flex-col gap-1">
				{#each missing as line (line.wrote)}
					<li class="flex items-center gap-2">
						<span class="min-w-0 flex-1 truncate font-semibold">{line.wrote}</span>
						<button
							type="button"
							class="rounded-full border-2 border-ink bg-surface px-2.5 py-0.5 text-sm font-extrabold"
							onclick={() => ((mode = 'search'), find(line))}>Find it</button
						>
						<button
							type="button"
							aria-label="Skip {line.wrote}"
							class="px-1 font-extrabold opacity-50"
							onclick={() => (missing = missing.filter((m) => m !== line))}>✕</button
						>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	{#if items.length}
		<ul class="mt-4 flex flex-col gap-2">
			{#each items as item (item.osmId)}
				<li class="sticker rounded-2xl bg-surface px-3 py-2">
					<div class="flex items-center gap-2">
						<div class="min-w-0 flex-1">
							<p class="truncate font-extrabold">
								{item.name}
								{#if owned.has(item.name.toLowerCase())}<span
										class="ml-1 text-xs font-extrabold opacity-60">already on your map</span
									>{/if}
							</p>
							<p class="truncate text-sm font-semibold opacity-60">
								{[item.street, item.area].filter(Boolean).join(' · ') || 'Bangalore'}
								{#if item.alternatives?.length}
									·
									<button
										type="button"
										class="font-extrabold underline"
										onclick={() => (swapping = swapping === item.osmId ? null : item.osmId)}
										>Not this one?</button
									>
								{/if}
							</p>
						</div>
						<button
							type="button"
							class="shrink-0 rounded-full border-2 border-ink px-2.5 py-0.5 text-sm font-extrabold"
							class:bg-sun={!item.category && !item.customCategoryId}
							onclick={() => (open = open === item.osmId ? null : item.osmId)}
						>
							{label(item)}
						</button>
						<button
							type="button"
							aria-label="Remove {item.name}"
							class="px-1 text-lg font-extrabold opacity-50"
							onclick={() => (items = items.filter((i) => i.osmId !== item.osmId))}>✕</button
						>
					</div>
					{#if item.wrote !== undefined}
						<input
							bind:value={item.tip}
							maxlength="280"
							placeholder="Add a tip: what to order?"
							aria-label="Tip for {item.name}"
							class="mt-1.5 w-full rounded-xl bg-paper px-2.5 py-1.5 text-sm font-semibold italic outline-none"
						/>
					{/if}
					{#if swapping === item.osmId && item.alternatives}
						<ul class="mt-2 flex flex-col gap-1">
							<li class="text-xs font-extrabold opacity-60">
								You wrote “{item.wrote}”. Did you mean:
							</li>
							{#each item.alternatives as alt (alt.osmId)}
								<li>
									<button
										type="button"
										class="w-full rounded-xl border-2 border-ink/20 px-2.5 py-1 text-left"
										onclick={() => swap(item, alt)}
									>
										<span class="font-extrabold">{alt.name}</span>
										<span class="text-sm font-semibold opacity-60"
											>{[alt.street, alt.area].filter(Boolean).join(' · ')}</span
										>
									</button>
								</li>
							{/each}
							<li>
								<button
									type="button"
									class="text-sm font-extrabold underline"
									onclick={() => {
										items = items.filter((i) => i.osmId !== item.osmId);
										mode = 'search';
										find({
											wrote: item.wrote ?? item.name,
											tip: item.tip,
											category: item.category,
											match: null,
											alternatives: []
										});
									}}>None of these, search again</button
								>
							</li>
						</ul>
					{/if}
					{#if open === item.osmId}
						<div class="mt-2">
							<CategoryPicker
								compact
								value={item}
								{customCategories}
								oncreate={newCategory}
								onchange={(v) => {
									item.category = v.category;
									item.customCategoryId = v.customCategoryId;
									open = null;
								}}
							/>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}

	{#snippet footer()}
		{#if error && mode === 'search'}<p class="mb-2 font-extrabold text-accent" role="alert">
				{error}
			</p>{/if}
		<button
			type="button"
			disabled={busy || reading}
			onclick={finish}
			class="sticker w-full rounded-full bg-sun py-3 text-xl font-extrabold disabled:opacity-60"
		>
			{#if busy}Saving…{:else if items.length}Done, show my map ({items.length}) →{:else}Skip for
				now{/if}
		</button>
	{/snippet}
</Sheet>

<style>
	.tab[aria-selected='true'] {
		background: var(--ink);
		color: var(--surface);
	}
</style>
