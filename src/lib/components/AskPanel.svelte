<script lang="ts">
	import { onMount } from 'svelte';

	// "Ask this map": its own clearly-labelled entry, separate from plain search,
	// with example questions so people know what it's for.
	type Props = {
		owner: string;
		initial?: string;
		asking: boolean;
		/** Hide the example questions once an answer is showing. */
		answered?: boolean;
		onask: (question: string) => void;
		onclose: () => void;
	};
	let { owner, initial = '', asking, answered = false, onask, onclose }: Props = $props();

	let question = $state('');
	let input: HTMLInputElement | undefined = $state();
	const examples = [
		'🌶️ Something spicy and filling?',
		'☕ Quick breakfast before work?',
		'🌙 A good date night spot?',
		'💸 Cheap but really good?'
	];

	onMount(() => {
		question = initial;
		input?.focus();
	});

	function submit(e?: SubmitEvent) {
		e?.preventDefault();
		const q = question.trim();
		if (q.length >= 3 && !asking) onask(q);
	}
</script>

<div class="px-4 pt-1 pb-2">
	<form onsubmit={submit} class="flex items-center gap-2">
		<label class="ask-box min-w-0 flex-1">
			<span aria-hidden="true">✨</span>
			<input
				bind:this={input}
				bind:value={question}
				onkeydown={(e) => e.key === 'Escape' && onclose()}
				placeholder="Ask {owner}'s map anything…"
				enterkeyhint="send"
				maxlength="200"
				aria-label="Ask this map"
				class="min-w-0 flex-1 bg-transparent outline-none placeholder:text-surface/70"
			/>
		</label>
		<button
			type="submit"
			disabled={asking || question.trim().length < 3}
			class="sticker rounded-full bg-sun px-4 py-2 font-extrabold disabled:opacity-60"
		>
			{asking ? '…' : 'Ask'}
		</button>
		<button
			type="button"
			onclick={onclose}
			aria-label="Close Ask"
			class="sticker grid size-10 flex-none place-items-center rounded-full bg-surface font-extrabold"
			>✕</button
		>
	</form>
	{#if !asking && !answered}
		<div class="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto">
			{#each examples as ex (ex)}
				<button
					type="button"
					class="flex-none rounded-full border-2 border-ink bg-surface px-3 py-1 text-sm font-extrabold whitespace-nowrap"
					onclick={() => ((question = ex.replace(/^\S+\s/, '')), submit())}
				>
					{ex}
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.ask-box {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.55rem 0.9rem;
		border-radius: 999px;
		border: 2.5px solid var(--ink);
		box-shadow: 2px 2px 0 var(--ink);
		background: linear-gradient(100deg, var(--accent), #8338ec);
		color: var(--surface);
		font-weight: 800;
		font-size: 16px;
	}
</style>
