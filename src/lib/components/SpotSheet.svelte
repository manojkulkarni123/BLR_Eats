<script lang="ts">
	import { untrack } from 'svelte';
	import Sheet from './Sheet.svelte';
	import { directionsUrl } from '#lib/share.ts';
	import type { Spot } from '#lib/types.ts';

	// Everything about one spot: all photos, the full recommendation, the reel, and actions.
	type Props = {
		spot: Spot;
		emoji: string;
		label: string;
		swatch: { bg: string; on: string };
		recommendedBy: string;
		onclose: () => void;
		onshare: () => void;
		onedit?: () => void;
	};
	let { spot, emoji, label, swatch, recommendedBy, onclose, onshare, onedit }: Props = $props();

	let viewing: number | null = $state(null);
	let strip: HTMLDivElement | undefined = $state();
	let current = $state(0);

	function onScroll() {
		if (!strip) return;
		current = Math.round(strip.scrollLeft / strip.clientWidth);
	}
</script>

<Sheet title={spot.name} {onclose}>
	<div class="flex flex-col gap-4" style="--bg:{swatch.bg};--on:{swatch.on}">
		<div class="flex flex-wrap items-center gap-2 font-extrabold">
			<span class="rounded-full border-2 border-ink bg-[var(--bg)] px-3 py-0.5 text-[var(--on)]">
				{emoji}
				{label || 'Spot'}
			</span>
			<span class="opacity-70">📍 {spot.area || 'Bangalore'}</span>
		</div>

		{#if spot.photos.length}
			<div class="relative">
				<div
					bind:this={strip}
					onscroll={onScroll}
					class="no-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-3xl border-[2.5px] border-ink"
				>
					{#each spot.photos as photo, i (photo.id)}
						<button
							type="button"
							class="aspect-[4/3] w-full flex-none snap-center"
							onclick={() => (viewing = i)}
							aria-label="View photo {i + 1} full screen"
						>
							<img
								src={photo.url}
								alt="{spot.name}, photo {i + 1}"
								width={photo.width}
								height={photo.height}
								loading={i === 0 ? 'eager' : 'lazy'}
								decoding="async"
								class="h-full w-full object-cover"
							/>
						</button>
					{/each}
				</div>
				{#if spot.photos.length > 1}
					<div class="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
						{#each spot.photos as photo, i (photo.id)}
							<span
								class="size-2 rounded-full border border-ink"
								class:bg-surface={i === current}
								class:bg-ink={i !== current}
							></span>
						{/each}
					</div>
				{/if}
			</div>
		{:else}
			<div
				class="grid h-32 place-items-center rounded-3xl border-[2.5px] border-ink bg-[var(--bg)] text-7xl"
			>
				<span class="emoji">{emoji}</span>
			</div>
		{/if}

		{#if spot.recommendation}
			<blockquote class="sticker rounded-3xl bg-surface p-4">
				<p class="text-lg leading-snug font-semibold whitespace-pre-line">{spot.recommendation}</p>
				<footer class="mt-2 text-sm font-extrabold opacity-60">— {recommendedBy}</footer>
			</blockquote>
		{/if}

		{#if spot.reelUrl}
			<a
				href={spot.reelUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="sticker flex items-center justify-center gap-2 rounded-full bg-accent py-2.5 font-extrabold text-surface"
			>
				▶ Watch the reel on Instagram
			</a>
		{/if}
	</div>

	{#snippet footer()}
		<div class="flex gap-2">
			<a
				href={directionsUrl(spot.lat, spot.lng)}
				target="_blank"
				rel="noopener noreferrer"
				class="sticker flex-1 rounded-full bg-ink py-3 text-center text-lg font-extrabold text-paper"
			>
				Take me there →
			</a>
			{#if onedit}
				<button
					type="button"
					onclick={onedit}
					aria-label="Edit {spot.name}"
					class="sticker grid size-12 place-items-center rounded-full bg-surface text-xl"
				>
					✏️
				</button>
			{/if}
			<button
				type="button"
				onclick={onshare}
				aria-label="Share {spot.name}"
				class="sticker grid size-12 place-items-center rounded-full bg-sun text-xl font-extrabold"
			>
				↗
			</button>
		</div>
	{/snippet}
</Sheet>

{#if viewing !== null}
	<div
		class="fixed inset-0 z-50 flex flex-col bg-ink"
		role="dialog"
		aria-modal="true"
		aria-label="Photos"
	>
		<div class="flex items-center justify-between p-4 text-paper">
			<span class="font-extrabold">{viewing + 1} / {spot.photos.length}</span>
			<button
				type="button"
				onclick={() => (viewing = null)}
				aria-label="Close photos"
				class="grid size-11 place-items-center rounded-full border-2 border-paper text-xl font-extrabold"
			>
				✕
			</button>
		</div>
		<div
			class="no-scrollbar flex flex-1 snap-x snap-mandatory overflow-x-auto"
			{@attach (el) => {
				// Open on the tapped photo; later swipes shouldn't re-run this.
				el.scrollLeft = el.clientWidth * untrack(() => viewing ?? 0);
			}}
			onscroll={(e) => {
				const el = e.currentTarget;
				viewing = Math.round(el.scrollLeft / el.clientWidth);
			}}
		>
			{#each spot.photos as photo, i (photo.id)}
				<div class="grid h-full w-full flex-none snap-center place-items-center p-2">
					<img
						src={photo.url}
						alt="{spot.name}, photo {i + 1}"
						class="max-h-full max-w-full rounded-2xl object-contain"
					/>
				</div>
			{/each}
		</div>
	</div>
{/if}

<style>
	.emoji {
		filter: drop-shadow(3px 3px 0 var(--ink));
		transform: rotate(-8deg);
	}
</style>
