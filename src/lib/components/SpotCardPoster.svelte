<script lang="ts">
	import FoodIcon from './FoodIcon.svelte';
	import UiIcon from './UiIcon.svelte';
	import { iconColors, iconKeyFor } from '#lib/look.ts';
	import { directionsUrl } from '#lib/share.ts';
	import type { Theme } from '#lib/theme.ts';
	import type { Spot } from '#lib/types.ts';

	// The Bengaluru Poster card: illustration (or photo) on the left, words on paper on the right.
	type Props = {
		spot: Spot;
		label: string;
		theme: Theme;
		selected: boolean;
		onfocus: () => void;
		onshare: () => void;
		onedit?: () => void;
	};
	let { spot, label, theme, selected, onfocus, onshare, onedit }: Props = $props();

	const colors = $derived(iconColors(theme, spot));
	const photo = $derived(spot.photos[0] ?? null);
	const longName = $derived(spot.name.length > 18);
</script>

<article class="card" class:selected style="--spot:{colors.spot}">
	<button type="button" class="art" onclick={onfocus} aria-label="Open {spot.name}">
		{#if photo}
			<img src={photo.thumbUrl} alt="" loading="lazy" decoding="async" />
			<span class="badge"><FoodIcon kind={iconKeyFor(spot)} {colors} size={30} /></span>
		{:else}
			<FoodIcon kind={iconKeyFor(spot)} {colors} size={62} />
		{/if}
	</button>
	<div class="body">
		<button type="button" class="words" onclick={onfocus}>
			<span class="kicker">{label || 'Spot'} · {spot.area || 'Bengaluru'}</span>
			<span class="title name" class:long={longName}>{spot.name}</span>
			{#if spot.recommendation}
				<span class="tip" class:clamp1={longName}>“{spot.recommendation}”</span>
			{:else if onedit}
				<span class="tip muted">Add your tip: what should people get?</span>
			{/if}
		</button>
		<div class="actions">
			<a
				class="go"
				href={directionsUrl(spot.lat, spot.lng)}
				target="_blank"
				rel="noopener noreferrer"
			>
				<UiIcon name="directions" size={17} /> Directions
			</a>
			{#if onedit}
				<button type="button" class="round" onclick={onedit} aria-label="Edit {spot.name}">
					<UiIcon name="edit" size={17} />
				</button>
			{/if}
			<button type="button" class="round" onclick={onshare} aria-label="Share {spot.name}">
				<UiIcon name="share" size={17} />
			</button>
		</div>
	</div>
</article>

<style>
	.card {
		display: flex;
		height: 100%;
		border: 2px solid var(--ink);
		border-radius: 22px;
		background: var(--surface);
		overflow: hidden;
		box-shadow: 4px 4px 0 var(--spot);
		transition: transform 300ms cubic-bezier(0.34, 1.3, 0.64, 1);
	}
	.card.selected {
		transform: translateY(-6px);
	}
	.art {
		position: relative;
		flex: none;
		width: 34%;
		display: grid;
		place-items: center;
		background: color-mix(in srgb, var(--spot) 22%, var(--paper));
		border-right: 2px solid var(--ink);
		overflow: hidden;
	}
	.art img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.badge {
		position: absolute;
		left: 8px;
		top: 8px;
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: var(--surface);
		border: 1.5px solid var(--ink);
	}
	.body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		padding: 12px 12px 12px 14px;
	}
	.words {
		display: flex;
		flex-direction: column;
		min-height: 0;
		text-align: left;
	}
	.kicker {
		font-size: 10.5px;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		opacity: 0.6;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.name {
		font-size: 25px;
		font-weight: 800;
		line-height: 1;
		margin: 3px 0 6px;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.name.long {
		font-size: 20px;
	}
	.tip {
		font-size: 14px;
		line-height: 1.35;
		font-weight: 500;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.tip.clamp1 {
		-webkit-line-clamp: 1;
		line-clamp: 1;
	}
	.tip.muted {
		opacity: 0.55;
		font-style: italic;
	}
	.actions {
		margin-top: auto;
		padding-top: 8px;
		display: flex;
		gap: 6px;
	}
	.go {
		flex: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 7px 12px;
		border-radius: 999px;
		background: var(--ink);
		color: var(--paper);
		font-weight: 800;
		font-size: 14px;
	}
	.round {
		flex: none;
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		border: 1.5px solid var(--ink);
		background: var(--surface);
	}
</style>
