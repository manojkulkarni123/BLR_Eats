<script lang="ts">
	import { untrack } from 'svelte';
	import Sheet from './Sheet.svelte';
	import PlaceSearch from './PlaceSearch.svelte';
	import CategoryPicker from './CategoryPicker.svelte';
	import type { CategoryKey } from '#lib/categories.ts';
	import type { Place } from '#lib/places.ts';
	import {
		addPhotos,
		createCustomCategory,
		createSpots,
		deletePhoto,
		deleteSpot,
		updateSpot
	} from '#lib/spots-client.ts';
	import type { FoodMap, Spot } from '#lib/types.ts';

	type Props = {
		map: FoodMap;
		ownerId: string;
		/** Editing this spot; adding a new one when absent. */
		spot?: Spot | null;
		onclose: () => void;
		/** Called after a save or delete; the screen reloads the map. */
		ondone: (result: { savedId?: string; deleted?: boolean }) => Promise<void>;
	};

	let { map, ownerId, spot = null, onclose, ondone }: Props = $props();
	const MAX_PHOTOS = 4;

	const initial = untrack(() => spot);
	let place: Place | null = $state(
		initial
			? {
					name: initial.name,
					lat: initial.lat,
					lng: initial.lng,
					area: initial.area,
					osmId: '',
					suggestedCategory: null
				}
			: null
	);
	let manual = $state(false);
	let manualName = $state('');
	let name = $state(initial?.name ?? '');
	let pick = $state<{ category: CategoryKey | null; customCategoryId: string | null }>({
		category: initial?.category ?? null,
		customCategoryId: initial?.customCategoryId ?? null
	});
	let recommendation = $state(initial?.recommendation ?? '');
	let reelUrl = $state(initial?.reelUrl ?? '');
	let showReel = $state(Boolean(initial?.reelUrl));
	let keptPhotos = $state(initial ? [...initial.photos] : []);
	let newFiles: File[] = $state([]);
	let previews: string[] = $state([]);
	let busy = $state(false);
	let error: string | null = $state(null);
	let customCategories = $state(untrack(() => [...map.customCategories]));

	const photoCount = $derived(keptPhotos.length + newFiles.length);

	function choosePlace(p: Place) {
		place = manual ? { ...p, name: manualName.trim() || p.name, osmId: '' } : p;
		name = place.name;
		if (!pick.category && !pick.customCategoryId && p.suggestedCategory) {
			pick = { category: p.suggestedCategory, customCategoryId: null };
		}
	}

	function onFiles(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const files = [...(input.files ?? [])].slice(0, MAX_PHOTOS - photoCount);
		newFiles = [...newFiles, ...files];
		previews = [...previews, ...files.map((f) => URL.createObjectURL(f))];
		input.value = '';
	}

	function removeNew(i: number) {
		URL.revokeObjectURL(previews[i]);
		newFiles = newFiles.filter((_, j) => j !== i);
		previews = previews.filter((_, j) => j !== i);
	}

	async function newCategory(catName: string, emoji: string) {
		const id = await createCustomCategory(ownerId, catName, emoji);
		customCategories = [...customCategories, { id, name: catName, slug: '', emoji }];
		return id;
	}

	async function save() {
		if (!place) return;
		if (!name.trim()) return (error = 'Give it a name');
		busy = true;
		error = null;
		const input = {
			name,
			lat: place.lat,
			lng: place.lng,
			area: place.area,
			category: pick.category,
			customCategoryId: pick.customCategoryId,
			recommendation: recommendation || null,
			reelUrl: showReel && reelUrl ? reelUrl : null,
			osmId: place.osmId || null
		};
		try {
			let id: string;
			if (spot) {
				id = spot.id;
				await updateSpot(ownerId, spot, input);
				const removed = spot.photos.filter((p) => !keptPhotos.some((k) => k.id === p.id));
				await Promise.all(removed.map(deletePhoto));
			} else {
				[id] = await createSpots(ownerId, [input], map.spots);
			}
			if (newFiles.length) await addPhotos(ownerId, id, newFiles, keptPhotos.length);
			await ondone({ savedId: id });
		} catch (e) {
			error =
				e instanceof Error && /reel_url/.test(e.message)
					? 'The reel link should start with https://www.instagram.com/'
					: 'Couldn’t save. Check your connection and try again';
			busy = false;
		}
	}

	async function remove() {
		if (!spot || !confirm(`Remove ${spot.name} from your map?`)) return;
		busy = true;
		try {
			await deleteSpot(spot);
			await ondone({ deleted: true });
		} catch {
			error = 'Couldn’t remove it. Try again';
			busy = false;
		}
	}
</script>

<Sheet title={spot ? 'Edit spot' : place ? 'Nice pick' : 'Add a spot'} {onclose}>
	{#if !place}
		{#if manual}
			<div class="flex flex-col gap-3">
				<input
					bind:value={manualName}
					placeholder="What's the place called?"
					class="sticker rounded-2xl bg-surface px-4 py-3 text-lg font-semibold outline-none"
				/>
				<p class="font-semibold opacity-70">Now find its area or the nearest landmark:</p>
				<PlaceSearch
					onpick={choosePlace}
					placeholder="e.g. Indiranagar 12th Main"
					autofocus={false}
				/>
			</div>
		{:else}
			<PlaceSearch onpick={choosePlace} />
			<button type="button" class="mt-4 font-extrabold underline" onclick={() => (manual = true)}>
				Can’t find it? Add it by hand
			</button>
		{/if}
	{:else}
		<div class="flex flex-col gap-4">
			<label class="flex flex-col gap-1">
				<span class="font-extrabold">Name</span>
				<input
					bind:value={name}
					maxlength="80"
					class="sticker rounded-2xl bg-surface px-4 py-2.5 text-lg font-semibold outline-none"
				/>
				<span class="text-sm font-semibold opacity-60">📍 {place.area || 'Bangalore'}</span>
			</label>

			<div class="flex flex-col gap-1.5">
				<span class="font-extrabold">What kind of place?</span>
				<CategoryPicker
					value={pick}
					{customCategories}
					onchange={(v) => (pick = v)}
					oncreate={newCategory}
				/>
			</div>

			<label class="flex flex-col gap-1">
				<span class="font-extrabold"
					>What should people get? <span class="font-semibold opacity-50">(optional)</span></span
				>
				<textarea
					bind:value={recommendation}
					maxlength="200"
					rows="2"
					placeholder="Benne masala dosa. Go before 9 to beat the queue."
					class="sticker resize-none rounded-2xl bg-surface px-4 py-2.5 font-semibold outline-none"
				></textarea>
			</label>

			<div class="flex flex-col gap-1.5">
				<span class="font-extrabold"
					>Photos <span class="font-semibold opacity-50">(optional)</span></span
				>
				<div class="flex flex-wrap gap-2">
					{#each keptPhotos as p (p.id)}
						<div class="relative">
							<img
								src={p.thumbUrl}
								alt=""
								class="size-20 rounded-xl border-2 border-ink object-cover"
							/>
							<button
								type="button"
								aria-label="Remove photo"
								onclick={() => (keptPhotos = keptPhotos.filter((k) => k.id !== p.id))}
								class="absolute -top-2 -right-2 grid size-7 place-items-center rounded-full border-2 border-ink bg-surface text-sm font-extrabold"
								>✕</button
							>
						</div>
					{/each}
					{#each previews as src, i (src)}
						<div class="relative">
							<img {src} alt="" class="size-20 rounded-xl border-2 border-ink object-cover" />
							<button
								type="button"
								aria-label="Remove photo"
								onclick={() => removeNew(i)}
								class="absolute -top-2 -right-2 grid size-7 place-items-center rounded-full border-2 border-ink bg-surface text-sm font-extrabold"
								>✕</button
							>
						</div>
					{/each}
					{#if photoCount < MAX_PHOTOS}
						<label
							class="grid size-20 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-ink bg-surface text-3xl"
						>
							📷
							<input type="file" accept="image/*" multiple class="sr-only" onchange={onFiles} />
						</label>
					{/if}
				</div>
			</div>

			{#if showReel}
				<label class="flex flex-col gap-1">
					<span class="font-extrabold">Instagram reel link</span>
					<input
						bind:value={reelUrl}
						type="url"
						placeholder="https://www.instagram.com/reel/…"
						class="sticker rounded-2xl bg-surface px-4 py-2.5 font-semibold outline-none"
					/>
				</label>
			{:else}
				<button
					type="button"
					class="self-start font-extrabold underline"
					onclick={() => (showReel = true)}
				>
					＋ Link your Instagram reel
				</button>
			{/if}
		</div>
	{/if}

	{#snippet footer()}
		{#if error}<p class="mb-2 font-extrabold text-accent" role="alert">{error}</p>{/if}
		{#if place}
			<div class="flex gap-2">
				{#if spot}
					<button
						type="button"
						disabled={busy}
						onclick={remove}
						class="sticker rounded-full bg-surface px-4 py-3 font-extrabold"
					>
						Remove
					</button>
				{:else}
					<button
						type="button"
						disabled={busy}
						onclick={() => (place = null)}
						class="sticker rounded-full bg-surface px-4 py-3 font-extrabold"
					>
						Back
					</button>
				{/if}
				<button
					type="button"
					disabled={busy}
					onclick={save}
					class="sticker flex-1 rounded-full bg-sun py-3 text-xl font-extrabold disabled:opacity-60"
				>
					{busy ? 'Saving…' : spot ? 'Save' : 'Add to my map'}
				</button>
			</div>
		{:else}
			<p class="text-center text-sm font-semibold opacity-60">Bangalore places only, for now.</p>
		{/if}
	{/snippet}
</Sheet>
