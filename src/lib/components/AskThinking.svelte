<script lang="ts">
	import { onMount } from 'svelte';

	// Shown the moment someone asks, so they're never left staring at a still screen.
	let { owner }: { owner: string } = $props();
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
		<span class="bob">🥞</span>
		<span class="bob" style="animation-delay:150ms">🍜</span>
		<span class="bob" style="animation-delay:300ms">🍛</span>
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
