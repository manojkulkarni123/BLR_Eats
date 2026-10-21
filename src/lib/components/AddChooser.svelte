<script lang="ts">
	import Sheet from './Sheet.svelte';

	// The one way into adding: tap "Add spot", then pick how. Fastest first.
	type Choice = 'one' | 'several' | 'paste';
	type Props = { onpick: (choice: Choice) => void; onclose: () => void };
	let { onpick, onclose }: Props = $props();

	const options: { id: Choice; emoji: string; title: string; blurb: string; badge?: string }[] = [
		{
			id: 'paste',
			emoji: '💬',
			title: 'Tell us your spots',
			blurb:
				'Type it like you’d text a friend, or paste a list or Google Maps links. We’ll find each place and pin it.',
			badge: 'Fastest'
		},
		{
			id: 'several',
			emoji: '⚡',
			title: 'Search and add',
			blurb:
				'Search places one after another and add them in one go. Photos and tips can come later.'
		},
		{
			id: 'one',
			emoji: '📍',
			title: 'Add one spot',
			blurb: 'One place, done properly: photos, your tip and what to order.'
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
					<span class="self-start pt-0.5 text-3xl" aria-hidden="true">{o.emoji}</span>
					<span class="min-w-0 flex-1">
						<span class="flex items-center gap-2">
							<span class="text-lg leading-tight font-extrabold">{o.title}</span>
							{#if o.badge}
								<span
									class="rounded-full border-2 border-ink bg-sun px-2 text-xs leading-5 font-extrabold"
									>{o.badge}</span
								>
							{/if}
						</span>
						<span class="mt-0.5 block text-sm leading-snug font-semibold opacity-70">{o.blurb}</span
						>
					</span>
					<span class="text-xl font-extrabold" aria-hidden="true">→</span>
				</button>
			</li>
		{/each}
	</ul>
</Sheet>
