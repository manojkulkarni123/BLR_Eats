<script lang="ts">
	// A phone frame around a real app screenshot (static/landing, from scripts/landing-shots.mjs).
	type Props = { src: string; alt: string; tilt?: number; eager?: boolean; class?: string };
	let { src, alt, tilt = 0, eager = false, class: className = '' }: Props = $props();
</script>

<div class="phone {className}" style="--tilt:{tilt}deg">
	<img
		{src}
		{alt}
		width="390"
		height="844"
		loading={eager ? 'eager' : 'lazy'}
		fetchpriority={eager ? 'high' : 'auto'}
		decoding="async"
	/>
</div>

<style>
	/* No position here: the page places phones (absolute in the hero). */
	.phone {
		aspect-ratio: 390 / 844;
		border-radius: 44px;
		border: 9px solid #1e1532;
		background: #1e1532;
		overflow: hidden;
		rotate: var(--tilt);
		box-shadow:
			0 2px 0 1px #3a2f52 inset,
			0 30px 60px -20px rgb(30 21 50 / 0.45),
			0 12px 24px -12px rgb(30 21 50 / 0.3);
	}
	.phone img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: top;
		border-radius: 35px;
	}
</style>
