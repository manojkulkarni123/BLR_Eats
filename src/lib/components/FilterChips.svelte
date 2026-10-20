<script lang="ts">
	import type { Slice } from '#lib/types.ts';

	type Props = {
		slices: { slice: Slice; count: number }[];
		total: number;
		active: string | null;
		onpick: (slug: string | null) => void;
	};

	let { slices, total, active, onpick }: Props = $props();
</script>

<nav class="no-scrollbar flex gap-2 overflow-x-auto px-4 pt-1 pb-2" aria-label="Filter spots">
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
	.count {
		font-size: 12px;
		opacity: 0.6;
	}
</style>
