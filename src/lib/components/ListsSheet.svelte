<script lang="ts">
	import Sheet from './Sheet.svelte';
	import { createList, deleteList } from '#lib/spots-client.ts';
	import type { SpotList } from '#lib/types.ts';

	// Hand-made lists ("Date night"). Spots are added to lists from each spot's editor.
	type Props = {
		ownerId: string;
		handle: string;
		lists: SpotList[];
		onclose: () => void;
		onchange: () => Promise<void>;
	};
	let { ownerId, handle, lists, onclose, onchange }: Props = $props();

	const ideas = [
		['🌙', 'Date night'],
		['💸', 'Under ₹300'],
		['☀️', 'Sunday brunch'],
		['🌶️', 'Spicy'],
		['🌱', 'Veg favourites'],
		['🕛', 'Late night']
	];
	let name = $state('');
	let emoji = $state('⭐');
	let busy = $state(false);
	let error: string | null = $state(null);

	async function create(e?: SubmitEvent) {
		e?.preventDefault();
		if (!name.trim()) return;
		busy = true;
		error = null;
		try {
			await createList(ownerId, name, emoji);
			name = '';
			emoji = '⭐';
			await onchange();
		} catch {
			error = 'Couldn’t create it. Is there already a list with that name?';
		} finally {
			busy = false;
		}
	}

	async function remove(list: SpotList) {
		if (!confirm(`Delete the list “${list.name}”? The spots stay on your map.`)) return;
		busy = true;
		try {
			await deleteList(list.id);
			await onchange();
		} finally {
			busy = false;
		}
	}
</script>

<Sheet title="Your lists" {onclose}>
	<p class="mb-3 font-semibold opacity-80">
		Hand-pick spots for a mood, like “Date night”. Each list gets its own link to share. Add spots
		to a list from the spot’s ✏️ edit screen.
	</p>

	{#if lists.length}
		<ul class="mb-4 flex flex-col gap-2">
			{#each lists as list (list.id)}
				<li class="sticker flex items-center gap-3 rounded-2xl bg-surface px-3 py-2">
					<span class="text-2xl">{list.emoji}</span>
					<span class="min-w-0 flex-1">
						<span class="block truncate font-extrabold">{list.name}</span>
						<span class="block truncate text-sm font-semibold opacity-60">
							{list.spotIds.length} spots · /{handle}/{list.slug}
						</span>
					</span>
					<button
						type="button"
						disabled={busy}
						onclick={() => remove(list)}
						aria-label="Delete {list.name}"
						class="px-1 text-lg font-extrabold opacity-50">✕</button
					>
				</li>
			{/each}
		</ul>
	{/if}

	<form onsubmit={create} class="flex gap-2">
		<input
			bind:value={emoji}
			maxlength="4"
			aria-label="Emoji"
			class="sticker w-14 rounded-xl bg-surface text-center text-xl outline-none"
		/>
		<input
			bind:value={name}
			maxlength="30"
			placeholder="New list, e.g. Date night"
			class="sticker min-w-0 flex-1 rounded-xl bg-surface px-3 py-2 font-semibold outline-none"
		/>
		<button disabled={busy} class="sticker rounded-xl bg-ink px-3 font-extrabold text-paper">
			Add
		</button>
	</form>

	<div class="mt-3 flex flex-wrap gap-1.5">
		{#each ideas.filter(([, n]) => !lists.some((l) => l.name === n)) as [e, n] (n)}
			<button
				type="button"
				class="rounded-full border-2 border-dashed border-ink bg-surface px-3 py-1 text-sm font-extrabold"
				onclick={() => ((emoji = e), (name = n))}
			>
				{e}
				{n}
			</button>
		{/each}
	</div>

	{#if error}<p class="mt-2 font-extrabold text-accent" role="alert">{error}</p>{/if}
</Sheet>
