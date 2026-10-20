<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = { title: string; onclose: () => void; children: Snippet; footer?: Snippet };
	let { title, onclose, children, footer }: Props = $props();
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onclose()} />

<div class="fixed inset-0 z-30 flex items-end justify-center">
	<button
		type="button"
		class="backdrop absolute inset-0 bg-ink/40"
		aria-label="Close"
		onclick={onclose}
	></button>
	<div
		role="dialog"
		aria-modal="true"
		aria-label={title}
		class="panel relative flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-[28px] border-[2.5px] border-b-0 border-ink bg-paper"
	>
		<div class="flex items-center gap-3 px-5 pt-4 pb-2">
			<h2 class="title flex-1 text-2xl leading-tight font-extrabold">{title}</h2>
			<button
				type="button"
				onclick={onclose}
				aria-label="Close"
				class="sticker grid size-10 place-items-center rounded-full bg-surface text-xl font-extrabold"
			>
				✕
			</button>
		</div>
		<div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
			{@render children()}
		</div>
		{#if footer}
			<div class="border-t-2 border-ink/10 px-5 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
				{@render footer()}
			</div>
		{/if}
	</div>
</div>

<style>
	.panel {
		animation: rise-in 320ms cubic-bezier(0.34, 1.2, 0.64, 1) both;
	}
	.backdrop {
		animation: fade 200ms ease both;
	}
	@keyframes fade {
		from {
			opacity: 0;
		}
	}
</style>
