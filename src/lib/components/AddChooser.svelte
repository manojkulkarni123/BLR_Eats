<script lang="ts">
	import Sheet from './Sheet.svelte';

	// The one way into adding: tap "Add spot", then pick how. Keeps the profile menu
	// for profile things.
	type Choice = 'one' | 'several' | 'paste';
	type Props = { onpick: (choice: Choice) => void; onclose: () => void };
	let { onpick, onclose }: Props = $props();

	const options: { id: Choice; emoji: string; title: string; blurb: string }[] = [
		{ id: 'one', emoji: '📍', title: 'Add one spot', blurb: 'With a photo and your tip' },
		{ id: 'several', emoji: '⚡', title: 'Add several', blurb: 'Search, tap, next one. Fast' },
		{
			id: 'paste',
			emoji: '📋',
			title: 'Paste a list',
			blurb: 'From WhatsApp, Notes or Google Maps links'
		}
	];
</script>

<Sheet title="Add to your map" {onclose}>
	<ul class="flex flex-col gap-2.5 pb-1">
		{#each options as o (o.id)}
			<li>
				<button
					type="button"
					onclick={() => onpick(o.id)}
					class="sticker flex w-full items-center gap-3 rounded-2xl bg-surface px-4 py-3 text-left active:translate-y-px"
				>
					<span class="text-3xl" aria-hidden="true">{o.emoji}</span>
					<span class="min-w-0 flex-1">
						<span class="block text-lg leading-tight font-extrabold">{o.title}</span>
						<span class="block text-sm font-semibold opacity-65">{o.blurb}</span>
					</span>
					<span class="text-xl font-extrabold" aria-hidden="true">→</span>
				</button>
			</li>
		{/each}
	</ul>
</Sheet>
