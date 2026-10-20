<script lang="ts">
	import UiIcon from './UiIcon.svelte';
	import type { Spot } from '#lib/types.ts';
	import { directionsUrl } from '#lib/share.ts';

	type Props = {
		spot: Spot;
		emoji: string;
		label: string;
		swatch: { bg: string; on: string };
		selected: boolean;
		onfocus: () => void;
		onshare: () => void;
		/** Owner only. */
		onedit?: () => void;
	};

	let { spot, emoji, label, swatch, selected, onfocus, onshare, onedit }: Props = $props();
	const photo = $derived(spot.photos[0] ?? null);
	// Long names wrap to two lines, so they get a smaller size and the tip gets one line less.
	const long = $derived(spot.name.length > 18);
	const nameSize = (min: number, max: number) =>
		`${spot.name.length > 26 ? min : spot.name.length > 14 ? (min + max) / 2 : max}px`;
</script>

<article
	class="sticker relative flex h-full w-full flex-col overflow-hidden rounded-3xl transition-transform duration-300"
	class:selected
	style="--bg:{swatch.bg};--on:{swatch.on}"
>
	<button
		type="button"
		class="flex min-h-0 flex-1 overflow-hidden bg-[var(--bg)] text-left text-[var(--on)]"
		onclick={onfocus}
	>
		{#if photo}
			<!-- Photo card: photo on the left at full height, words on the right. -->
			<div class="relative w-[42%] flex-none overflow-hidden border-r-[2.5px] border-ink">
				<img
					src={photo.thumbUrl}
					alt={spot.name}
					loading="lazy"
					decoding="async"
					class="h-full w-full object-cover"
				/>
				<span
					class="sticker absolute top-2 left-2 grid size-9 place-items-center rounded-full bg-[var(--bg)] text-lg"
				>
					{emoji}
				</span>
			</div>
			<div class="flex min-w-0 flex-1 flex-col gap-0.5 px-3 pt-3">
				<p class="truncate text-[11px] font-semibold tracking-wider uppercase opacity-80">
					{label || '📍'} · {spot.area}
				</p>
				<h2 class="name font-extrabold" style="font-size:{nameSize(18, 22)}">{spot.name}</h2>
				{#if spot.recommendation}
					<p
						class="text-[14px] leading-snug font-semibold opacity-95"
						class:line-clamp-2={long}
						class:line-clamp-3={!long}
					>
						{spot.recommendation}
					</p>
				{/if}
			</div>
		{:else}
			<!-- No-photo card: a first-class look, not a placeholder. -->
			<div class="relative flex min-w-0 flex-1 flex-col px-4 pt-3">
				<span
					class="sticker-emoji pointer-events-none absolute -top-2 -right-3 text-[80px] leading-none"
				>
					{emoji}
				</span>
				<p class="text-xs font-semibold tracking-wider uppercase opacity-80">{label || 'Spot'}</p>
				<h2 class="name max-w-[72%] font-extrabold" style="font-size:{nameSize(20, 28)}">
					{spot.name}
				</h2>
				<p class="truncate pr-16 text-sm font-semibold opacity-90">📍 {spot.area}</p>
				{#if spot.recommendation}
					<p
						class="bubble mt-auto mb-2 rounded-2xl bg-surface px-3 py-1.5 text-[15px] leading-snug font-semibold text-ink"
						class:line-clamp-1={long}
						class:line-clamp-2={!long}
					>
						{spot.recommendation}
					</p>
				{/if}
			</div>
		{/if}
	</button>

	<div class="flex items-center gap-2 bg-[var(--bg)] px-3 pt-1 pb-3">
		<a
			href={directionsUrl(spot.lat, spot.lng)}
			target="_blank"
			rel="noopener noreferrer"
			class="sticker flex-1 rounded-full bg-ink py-2 text-center text-[15px] font-extrabold text-paper active:translate-y-px"
		>
			<span class="inline-flex items-center justify-center gap-1.5"
				><UiIcon name="directions" size={18} /> Take me there</span
			>
		</a>
		{#if onedit}
			<button
				type="button"
				onclick={onedit}
				aria-label="Edit {spot.name}"
				class="sticker grid size-10 place-items-center rounded-full bg-surface text-lg active:translate-y-px"
			>
				<UiIcon name="edit" size={19} />
			</button>
		{/if}
		<button
			type="button"
			onclick={onshare}
			aria-label="Share {spot.name}"
			class="sticker grid size-10 place-items-center rounded-full bg-surface text-lg active:translate-y-px"
		>
			<UiIcon name="share" size={20} />
		</button>
	</div>
</article>

<style>
	article.selected {
		transform: translateY(-6px) rotate(-0.6deg);
	}
	.sticker-emoji {
		transform: rotate(12deg);
		filter: drop-shadow(3px 3px 0 var(--ink));
	}
	.bubble {
		border: 2px solid var(--ink);
	}
	.name {
		line-height: 1.05;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
