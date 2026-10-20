<script lang="ts">
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
</script>

<article
	class="sticker relative flex h-full w-full flex-col overflow-hidden rounded-3xl transition-transform duration-300"
	class:selected
	style="--bg:{swatch.bg};--on:{swatch.on}"
>
	<button type="button" class="flex min-h-0 flex-1 flex-col text-left" onclick={onfocus}>
		{#if photo}
			<div class="relative min-h-0 flex-1 overflow-hidden border-b-[2.5px] border-ink">
				<img
					src={photo.url}
					alt={spot.name}
					width={photo.width}
					height={photo.height}
					loading="lazy"
					decoding="async"
					class="h-full w-full object-cover"
				/>
				<span
					class="sticker absolute top-2 left-2 grid size-10 place-items-center rounded-full bg-[var(--bg)] text-xl"
				>
					{emoji}
				</span>
			</div>
			<div class="bg-[var(--bg)] px-4 pt-2 pb-1 text-[var(--on)]">
				<h2 class="truncate text-xl leading-tight font-extrabold">{spot.name}</h2>
				<p class="truncate text-xs font-semibold tracking-wider uppercase opacity-80">
					{spot.area} · {label}
				</p>
			</div>
		{:else}
			<!-- No-photo card: a first-class look, not a placeholder. -->
			<div class="relative flex min-h-0 flex-1 flex-col bg-[var(--bg)] px-4 pt-3 text-[var(--on)]">
				<span
					class="sticker-emoji pointer-events-none absolute -top-2 -right-3 text-[88px] leading-none"
				>
					{emoji}
				</span>
				<p class="text-xs font-semibold tracking-wider uppercase opacity-80">{label}</p>
				<h2 class="max-w-[75%] text-[28px] leading-[1.05] font-extrabold">{spot.name}</h2>
				<p class="text-sm font-semibold opacity-90">📍 {spot.area}</p>
				{#if spot.recommendation}
					<p
						class="bubble mt-auto mb-2 line-clamp-2 rounded-2xl bg-surface px-3 py-1.5 text-[15px] leading-snug font-semibold text-ink"
					>
						{spot.recommendation}
					</p>
				{/if}
			</div>
		{/if}
	</button>

	{#if photo && spot.recommendation}
		<p
			class="line-clamp-2 bg-[var(--bg)] px-4 text-[15px] leading-snug font-semibold text-[var(--on)]"
		>
			{spot.recommendation}
		</p>
	{/if}

	<div class="flex items-center gap-2 bg-[var(--bg)] px-3 pt-1 pb-3">
		<a
			href={directionsUrl(spot.lat, spot.lng)}
			target="_blank"
			rel="noopener noreferrer"
			class="sticker flex-1 rounded-full bg-ink py-2 text-center text-[15px] font-extrabold text-paper active:translate-y-px"
		>
			Take me there →
		</a>
		{#if onedit}
			<button
				type="button"
				onclick={onedit}
				aria-label="Edit {spot.name}"
				class="sticker grid size-10 place-items-center rounded-full bg-surface text-lg active:translate-y-px"
			>
				✏️
			</button>
		{/if}
		<button
			type="button"
			onclick={onshare}
			aria-label="Share {spot.name}"
			class="sticker grid size-10 place-items-center rounded-full bg-surface text-lg active:translate-y-px"
		>
			↗
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
</style>
