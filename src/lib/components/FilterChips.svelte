<script lang="ts">
	import { tick } from 'svelte';
	import type { Slice } from '#lib/types.ts';

	type Props = {
		slices: { slice: Slice; count: number }[];
		total: number;
		active: string | null;
		onpick: (slug: string | null) => void;
		/** Viewer search inside this map. */
		query: string;
		onquery: (q: string) => void;
		/** Opens "Ask this map" (AI); absent when it's switched off. */
		onaskopen?: () => void;
	};

	let { slices, total, active, onpick, query, onquery, onaskopen }: Props = $props();
	let searching = $state(false);
	let input: HTMLInputElement | undefined = $state();

	async function openSearch() {
		searching = true;
		await tick();
		input?.focus();
	}

	function closeSearch() {
		searching = false;
		onquery('');
	}
</script>

{#if searching}
	<div class="flex items-center gap-2 px-4 pt-1 pb-2">
		<label class="chip min-w-0 flex-1 cursor-text">
			<span aria-hidden="true">🔎</span>
			<input
				bind:this={input}
				value={query}
				oninput={(e) => onquery(e.currentTarget.value)}
				onkeydown={(e) => e.key === 'Escape' && closeSearch()}
				placeholder="Search: biryani, Indiranagar, filter coffee…"
				enterkeyhint="search"
				aria-label="Search this map"
				class="min-w-0 flex-1 bg-transparent outline-none"
			/>
		</label>
		<button type="button" class="chip" onclick={closeSearch} aria-label="Close search">✕</button>
	</div>
{:else}
	<nav class="no-scrollbar flex gap-2 overflow-x-auto px-4 pt-1 pb-2" aria-label="Filter spots">
		{#if onaskopen}
			<button type="button" class="chip ask" onclick={onaskopen}>✨ Ask</button>
		{/if}
		<button type="button" class="chip" onclick={openSearch} aria-label="Search this map">🔎</button>
		<button type="button" class="chip" class:on={active === null} onclick={() => onpick(null)}>
			All <span class="count">{total}</span>
		</button>
		{#each slices as { slice, count } (slice.slug)}
			<button
				type="button"
				class="chip"
				class:on={active === slice.slug}
				onclick={() => onpick(slice.slug)}
			>
				{slice.emoji}
				{slice.label} <span class="count">{count}</span>
			</button>
		{/each}
	</nav>
{/if}

<style>
	.chip {
		flex: none;
		display: flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.3rem 0.8rem;
		border-radius: 999px;
		border: 2.5px solid var(--ink);
		background: var(--surface);
		color: var(--ink);
		font-weight: 800;
		font-size: 15px;
		white-space: nowrap;
		box-shadow: 2px 2px 0 var(--ink);
		transition:
			transform 160ms cubic-bezier(0.34, 1.56, 0.64, 1),
			background-color 160ms;
	}
	.chip:active {
		transform: scale(0.94);
	}
	.chip.on {
		background: var(--ink);
		color: var(--paper);
		transform: translateY(-1px);
	}
	label.chip {
		flex: 1;
		padding-top: 0.45rem;
		padding-bottom: 0.45rem;
	}
	label.chip:active {
		transform: none;
	}
	.chip.ask {
		background: linear-gradient(100deg, var(--accent), #8338ec);
		color: var(--surface);
	}
	.count {
		font-size: 12px;
		opacity: 0.6;
	}
</style>
