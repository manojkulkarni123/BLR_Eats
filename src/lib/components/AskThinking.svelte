<script lang="ts">
	import { onMount } from 'svelte';
	import FoodIcon from './FoodIcon.svelte';
	import type { Look } from '#lib/look.ts';
	import type { Theme } from '#lib/theme.ts';

	// Shown the moment someone asks, so they're never left staring at a still screen.
	let { owner, look = 'pop', theme }: { owner: string; look?: Look; theme?: Theme } = $props();
	const foods = ['south-indian', 'asian', 'biryani'] as const;
	const steps = $derived([
		`Reading ${owner}'s tips…`,
		'Matching your mood…',
		'Picking the best spots…',
		'Almost there…'
	]);
	let step = $state(0);

	onMount(() => {
		const timer = setInterval(() => (step = Math.min(step + 1, steps.length - 1)), 1100);
		return () => clearInterval(timer);
	});
</script>

<div class="flex items-center gap-4" role="status" aria-live="polite">
	<div class="flex gap-1 text-3xl" aria-hidden="true">
		{#if look === 'poster' && theme}
			{#each foods as k, i (k)}
				<span class="bob" style="animation-delay:{i * 150}ms">
					<FoodIcon
						kind={k}
						colors={{
							spot: theme.categories[k].bg,
							ink: theme.ui.ink,
							paper: theme.ui.surface,
							cream: '#F4D9A0'
						}}
						size={38}
					/>
				</span>
			{/each}
		{:else}
			<span class="bob">🥞</span>
			<span class="bob" style="animation-delay:150ms">🍜</span>
			<span class="bob" style="animation-delay:300ms">🍛</span>
		{/if}
	</div>
	<div class="min-w-0 flex-1">
		{#key step}
			<p class="fade text-[15px] font-extrabold">{steps[step]}</p>
		{/key}
		<div class="mt-2 h-2 overflow-hidden rounded-full bg-paper">
			<div class="bar h-full rounded-full"></div>
		</div>
	</div>
</div>

<style>
	.bob {
		display: inline-block;
		animation: bob 0.9s ease-in-out infinite;
	}
	@keyframes bob {
		0%,
		100% {
			transform: translateY(0) rotate(0);
		}
		50% {
			transform: translateY(-8px) rotate(-8deg);
		}
	}
	.fade {
		animation: fade 300ms ease both;
	}
	@keyframes fade {
		from {
			opacity: 0;
			transform: translateY(4px);
		}
	}
	/* An indeterminate bar: keeps moving, never pretends to know how long is left. */
	.bar {
		width: 40%;
		background: linear-gradient(90deg, var(--accent), #8338ec);
		animation: slide 1.2s ease-in-out infinite;
	}
	@keyframes slide {
		from {
			transform: translateX(-100%);
		}
		to {
			transform: translateX(250%);
		}
	}
</style>
