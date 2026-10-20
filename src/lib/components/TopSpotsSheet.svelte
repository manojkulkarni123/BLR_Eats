<script lang="ts">
	import { untrack } from 'svelte';
	import Sheet from './Sheet.svelte';
	import PlaceSearch from './PlaceSearch.svelte';
	import CategoryPicker from './CategoryPicker.svelte';
	import { categoryByKey, type CategoryKey } from '#lib/categories.ts';
	import type { Place } from '#lib/places.ts';
	import { createCustomCategory, createSpots } from '#lib/spots-client.ts';
	import type { FoodMap } from '#lib/types.ts';

	// First run: add your go-to places fast. Only a name and a category; photos
	// and recommendations can come later (DECISIONS.md, "Key flows").
	type Props = {
		map: FoodMap;
		ownerId: string;
		onclose: () => void;
		ondone: (added: number) => Promise<void>;
	};
	let { map, ownerId, onclose, ondone }: Props = $props();

	type Item = Place & { category: CategoryKey | null; customCategoryId: string | null };
	let items: Item[] = $state([]);
	let open: string | null = $state(null);
	let busy = $state(false);
	let error: string | null = $state(null);
	let customCategories = $state(untrack(() => [...map.customCategories]));

	function add(p: Place) {
		if (items.some((i) => i.osmId === p.osmId)) return;
		items = [{ ...p, category: p.suggestedCategory, customCategoryId: null }, ...items];
		// Ask for a category right away only when we couldn't guess one.
		open = p.suggestedCategory ? null : p.osmId;
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
					category: i.category,
					customCategoryId: i.customCategoryId,
					recommendation: null,
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

<Sheet title="Add your top spots" {onclose}>
	<p class="mb-3 font-semibold opacity-80">
		Your go-to places. Type a name, tap it, next one. Photos and tips can come later.
	</p>
	<PlaceSearch onpick={add} />

	{#if items.length}
		<ul class="mt-4 flex flex-col gap-2">
			{#each items as item (item.osmId)}
				<li class="sticker rounded-2xl bg-surface px-3 py-2">
					<div class="flex items-center gap-2">
						<div class="min-w-0 flex-1">
							<p class="truncate font-extrabold">{item.name}</p>
							<p class="truncate text-sm font-semibold opacity-60">{item.area || 'Bangalore'}</p>
						</div>
						<button
							type="button"
							class="rounded-full border-2 border-ink px-2.5 py-0.5 text-sm font-extrabold"
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
		{#if error}<p class="mb-2 font-extrabold text-accent" role="alert">{error}</p>{/if}
		<button
			type="button"
			disabled={busy}
			onclick={finish}
			class="sticker w-full rounded-full bg-sun py-3 text-xl font-extrabold disabled:opacity-60"
		>
			{#if busy}Saving…{:else if items.length}Done, show my map ({items.length}) →{:else}Skip for
				now{/if}
		</button>
	{/snippet}
</Sheet>
