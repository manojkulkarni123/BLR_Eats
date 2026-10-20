<script lang="ts">
	import { CATEGORIES, type CategoryKey } from '#lib/categories.ts';
	import type { CustomCategory } from '#lib/types.ts';

	type Value = { category: CategoryKey | null; customCategoryId: string | null };
	type Props = {
		value: Value;
		customCategories: CustomCategory[];
		onchange: (v: Value) => void;
		/** Create a custom category and return its id. */
		oncreate: (name: string, emoji: string) => Promise<string>;
		compact?: boolean;
	};

	let { value, customCategories, onchange, oncreate, compact = false }: Props = $props();
	let adding = $state(false);
	let newName = $state('');
	let newEmoji = $state('🍖');
	let busy = $state(false);

	async function create(e: SubmitEvent) {
		e.preventDefault();
		if (!newName.trim()) return;
		busy = true;
		try {
			const id = await oncreate(newName, newEmoji);
			onchange({ category: null, customCategoryId: id });
			adding = false;
			newName = '';
		} finally {
			busy = false;
		}
	}
</script>

<div class="flex flex-wrap gap-1.5" class:compact>
	{#each CATEGORIES as c (c.key)}
		<button
			type="button"
			class="chip"
			class:on={value.category === c.key}
			onclick={() => onchange({ category: c.key, customCategoryId: null })}
		>
			{c.emoji} {c.label}
		</button>
	{/each}
	{#each customCategories as c (c.id)}
		<button
			type="button"
			class="chip"
			class:on={value.customCategoryId === c.id}
			onclick={() => onchange({ category: null, customCategoryId: c.id })}
		>
			{c.emoji} {c.name}
		</button>
	{/each}
	{#if !compact}
		<button type="button" class="chip dashed" onclick={() => (adding = !adding)}>＋ Your own</button>
	{/if}
</div>

{#if adding}
	<form onsubmit={create} class="mt-2 flex gap-2">
		<input
			bind:value={newEmoji}
			maxlength="4"
			aria-label="Emoji"
			class="sticker w-14 rounded-xl bg-surface text-center text-xl outline-none"
		/>
		<input
			bind:value={newName}
			maxlength="30"
			placeholder="e.g. Military hotels"
			class="sticker min-w-0 flex-1 rounded-xl bg-surface px-3 py-2 font-semibold outline-none"
		/>
		<button disabled={busy} class="sticker rounded-xl bg-ink px-3 font-extrabold text-paper">Add</button>
	</form>
{/if}

<style>
	.chip {
		padding: 0.3rem 0.7rem;
		border-radius: 999px;
		border: 2px solid var(--ink);
		background: var(--surface);
		font-weight: 800;
		font-size: 14px;
		white-space: nowrap;
	}
	.compact .chip {
		font-size: 13px;
		padding: 0.15rem 0.55rem;
	}
	.chip.on {
		background: var(--ink);
		color: var(--paper);
	}
	.chip.dashed {
		border-style: dashed;
	}
</style>
