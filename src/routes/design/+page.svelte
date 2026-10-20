<script lang="ts">
	import '@fontsource-variable/fraunces/full.css';
	import '@fontsource-variable/fraunces/full-italic.css';
	import '@fontsource-variable/bricolage-grotesque';
	import MapView from '#lib/components/MapView.svelte';
	import UiIcon from '#lib/components/UiIcon.svelte';
	import InstagramIcon from '#lib/components/InstagramIcon.svelte';
	import FoodIcon from '#lib/components/FoodIcon.svelte';
	import { categoryByKey } from '#lib/categories.ts';
	import { ICONS, iconSvg, type IconKey } from '#lib/icons.ts';
	import { bengaluruPoster as theme, swatchFor } from '#lib/theme.ts';
	import type { Spot } from '#lib/types.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const map = $derived(data.map);
	const INK = theme.ui.ink;
	const PAPER = theme.ui.surface;
	const CREAM = '#F4D9A0';

	const keyFor = (s: Spot): IconKey => (s.category ?? 'spot') as IconKey;
	const spotColour = (s: Spot) => swatchFor(theme, s.category).bg;
	const colorsFor = (s: Spot) => ({ spot: spotColour(s), ink: INK, paper: PAPER, cream: CREAM });
	const icon = (s: Spot, size = 44) => iconSvg(keyFor(s), colorsFor(s), size);
	const label = (s: Spot) =>
		s.category ? categoryByKey[s.category].label : (map.customCategories[0]?.name ?? 'Spot');

	let selectedId: string | null = $state(null);
	const selected = $derived(map.spots.find((s) => s.id === selectedId) ?? map.spots[0]);

	const escapeHtml = (t: string) => t.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

	// Poster pins: a paper badge with the illustration; the selected one shows its name.
	const pinMarkup = (s: Spot) =>
		`<span class="ppin" style="--spot:${spotColour(s)}">` +
		`<span class="ppin-badge">${icon(s, 38)}</span>` +
		`<span class="ppin-name">${escapeHtml(s.name)}</span></span>`;

	const chips = [
		{ label: 'All', count: 11, on: true },
		{ label: 'South Indian', count: 3 },
		{ label: 'Cafés', count: 2 },
		{ label: 'Biryani', count: 1 },
		{ label: 'Basavanagudi', count: 3 }
	];

	// Poster mini-map: place spots inside a box, keeping their shape.
	const posterPins = $derived.by(() => {
		const lats = map.spots.map((s) => s.lat);
		const lngs = map.spots.map((s) => s.lng);
		const [minLat, maxLat, minLng, maxLng] = [
			Math.min(...lats),
			Math.max(...lats),
			Math.min(...lngs),
			Math.max(...lngs)
		];
		return map.spots.map((s) => ({
			s,
			x: 8 + ((s.lng - minLng) / (maxLng - minLng || 1)) * 84,
			y: 8 + ((maxLat - s.lat) / (maxLat - minLat || 1)) * 84
		}));
	});

	const allIcons = Object.keys(ICONS) as IconKey[];
	const iconColour = (k: IconKey) =>
		k === 'spot' ? theme.wildcard.bg : theme.categories[k as keyof typeof theme.categories].bg;
	const iconName = (k: IconKey) =>
		k === 'spot' ? 'Your own' : categoryByKey[k as keyof typeof categoryByKey].label;
</script>

<svelte:head>
	<title>Design preview · Bengaluru poster</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="poster grain">
	<header class="intro">
		<p class="kicker">Design preview · not live yet</p>
		<h1 class="display">Bengaluru <i>poster</i></h1>
		<p class="lede">
			A printed city poster someone designed for you: risograph inks on cream paper, our own food
			illustrations, a headline serif, and quiet chrome so the food carries the colour.
		</p>
	</header>

	<!-- 1. The map screen -->
	<section>
		<h2 class="section-title"><span>01</span> The map, on a phone</h2>
		<div class="phone">
			<div class="phone-map">
				<MapView
					{theme}
					spots={map.spots}
					frame={map.spots}
					emojiFor={() => ''}
					selectedId={selected.id}
					focus={null}
					userLocation={null}
					onselect={(id) => (selectedId = id)}
					{pinMarkup}
				/>
			</div>

			<div class="phone-top">
				<div class="owner">
					<span class="avatar">M</span>
					<div>
						<p class="owner-of">Manoj’s</p>
						<p class="owner-city">Bengaluru</p>
					</div>
					<div class="owner-actions">
						<button class="icon-btn" aria-label="Instagram"><InstagramIcon class="size-5" /></button
						>
						<button class="icon-btn solid" aria-label="Share"><UiIcon name="share" /></button>
					</div>
				</div>
				<p class="owner-meta">11 spots · Dosa first, questions later.</p>
				<div class="chips">
					<button class="chip ask"><UiIcon name="ask" size={17} /> Ask the map</button>
					{#each chips as c (c.label)}
						<button class="chip" class:on={c.on}>{c.label} <span>{c.count}</span></button>
					{/each}
				</div>
			</div>

			<div class="phone-bottom">
				<article class="card" style="--spot:{spotColour(selected)}">
					<div class="card-art">
						<FoodIcon kind={keyFor(selected)} colors={colorsFor(selected)} size={64} />
					</div>
					<div class="card-body">
						<p class="card-kicker">{label(selected)} · {selected.area}</p>
						<h3 class="card-name">{selected.name}</h3>
						{#if selected.recommendation}
							<p class="card-tip">“{selected.recommendation}”</p>
						{:else}
							<p class="card-tip muted">Manoj hasn’t written a tip yet.</p>
						{/if}
						<div class="card-actions">
							<button class="btn ink"><UiIcon name="directions" size={18} /> Directions</button>
							<button class="icon-btn" aria-label="Share"><UiIcon name="share" size={18} /></button>
						</div>
					</div>
				</article>
				<div class="dock">
					<button class="dock-btn"><UiIcon name="near" size={18} /> Near me</button>
					<button class="dock-btn primary">Make your own map</button>
				</div>
			</div>
		</div>
		<p class="note">
			Tap a pin: the selected spot shows its name on the map. Roads are quieter so the pins pop, and
			the bottom is one card plus a single dock instead of four floating buttons.
		</p>
	</section>

	<!-- 2. Icons -->
	<section>
		<h2 class="section-title"><span>02</span> Our own food illustrations</h2>
		<div class="icon-grid">
			{#each allIcons as k (k)}
				<figure>
					<FoodIcon
						kind={k}
						colors={{ spot: iconColour(k), ink: INK, paper: PAPER, cream: CREAM }}
						size={72}
					/>
					<figcaption>{iconName(k)}</figcaption>
				</figure>
			{/each}
		</div>
		<div class="compare">
			<div>
				<p class="compare-label">Before: phone emoji (look different on every phone)</p>
				<p class="emoji-row">🥞 🍛 🍗 🥟 🍜 🍔 🍕 🍝 🌮 ☕ 🍰 🍺</p>
			</div>
			<div>
				<p class="compare-label">Interface icons, same ink stroke</p>
				<div class="ui-row">
					{#each ['share', 'directions', 'search', 'near', 'add', 'edit', 'ask', 'close', 'heart', 'menu'] as const as n (n)}
						<span class="ui-icon"><UiIcon name={n} size={24} /></span>
					{/each}
				</div>
			</div>
		</div>
	</section>

	<!-- 3. Cards -->
	<section>
		<h2 class="section-title"><span>03</span> Cards</h2>
		<div class="card-row">
			{#each map.spots.slice(0, 3) as s (s.id)}
				<article class="card" style="--spot:{spotColour(s)}">
					<div class="card-art"><FoodIcon kind={keyFor(s)} colors={colorsFor(s)} size={64} /></div>
					<div class="card-body">
						<p class="card-kicker">{label(s)} · {s.area}</p>
						<h3 class="card-name">{s.name}</h3>
						<p class="card-tip">“{s.recommendation}”</p>
						<div class="card-actions">
							<button class="btn ink"><UiIcon name="directions" size={18} /> Directions</button>
							<button class="icon-btn" aria-label="Share"><UiIcon name="share" size={18} /></button>
						</div>
					</div>
				</article>
			{/each}
			<article class="card photo" style="--spot:{theme.categories.cafes.bg}">
				<div class="photo-fill">
					<span class="photo-badge">
						<FoodIcon
							kind="cafes"
							colors={{ spot: theme.categories.cafes.bg, ink: INK, paper: PAPER, cream: CREAM }}
							size={34}
						/>
					</span>
				</div>
				<div class="card-body">
					<p class="card-kicker">Cafés · Jayanagar</p>
					<h3 class="card-name">A spot with a photo</h3>
					<p class="card-tip">“The photo leads; words sit on paper beside it.”</p>
					<div class="card-actions">
						<button class="btn ink"><UiIcon name="directions" size={18} /> Directions</button>
					</div>
				</div>
			</article>
		</div>
	</section>

	<!-- 4. Share poster -->
	<section>
		<h2 class="section-title"><span>04</span> “Share as poster” for Instagram stories</h2>
		<div class="story grain">
			<p class="story-of">Manoj’s</p>
			<p class="story-city">Bengaluru</p>
			<p class="story-sub">11 spots worth the auto ride</p>
			<div class="story-map">
				<svg
					viewBox="0 0 100 100"
					preserveAspectRatio="none"
					class="story-roads"
					aria-hidden="true"
				>
					<path d="M-5 62 Q30 50 55 58 T105 40" />
					<path d="M38 -5 Q44 40 34 105" />
					<path d="M-5 20 Q40 32 105 18" class="thin" />
				</svg>
				<span class="story-lake" style="left:58%;top:30%"></span>
				<span class="story-park" style="left:18%;top:70%"></span>
				{#each posterPins as p (p.s.id)}
					<span class="story-pin" style="left:{p.x}%;top:{p.y}%"
						><FoodIcon kind={keyFor(p.s)} colors={colorsFor(p.s)} size={30} /></span
					>
				{/each}
			</div>
			<ol class="story-list">
				{#each map.spots.slice(0, 4) as s, i (s.id)}
					<li>
						<span class="story-n">{i + 1}</span>
						<span class="story-li-icon"
							><FoodIcon kind={keyFor(s)} colors={colorsFor(s)} size={26} /></span
						>
						<span><b>{s.name}</b> <em>{s.area}</em></span>
					</li>
				{/each}
			</ol>
			<p class="story-foot">blr-eats.vercel.app/manoj · make yours</p>
		</div>
	</section>

	<!-- 5. Type and colour -->
	<section>
		<h2 class="section-title"><span>05</span> Type &amp; colour</h2>
		<div class="type-sheet">
			<p class="display big">Benne dosa, <i>before nine.</i></p>
			<p class="ui-text">
				Bricolage Grotesque for everything you read and tap. Fraunces for names and headlines.
			</p>
		</div>
		<div class="swatches">
			{#each [['Paper', '#F4EAD5'], ['Ink', INK], ['Fluoro pink', '#FF48B0'], ['Yellow', '#FFE800'], ['Blue', '#0078BF'], ['Orange', '#FF6C2F'], ['Green', '#00A95C'], ['Teal', '#00838A']] as [n, c] (n)}
				<div class="swatch">
					<span style="background:{c}"></span>
					<p>{n}</p>
				</div>
			{/each}
		</div>
	</section>
</main>

<style>
	.poster {
		--paper: #f4ead5;
		--ink: #1f1a2e;
		--surface: #fffdf6;
		--pink: #ff48b0;
		--display: 'Fraunces Variable', Georgia, serif;
		--ui: 'Bricolage Grotesque Variable', system-ui, sans-serif;
		min-height: 100dvh;
		background: var(--paper);
		color: var(--ink);
		font-family: var(--ui);
		padding: 28px 16px 80px;
		position: relative;
	}
	/* Risograph paper grain. */
	.grain::after {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		opacity: 0.35;
		mix-blend-mode: multiply;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.12 0 0 0 0 0.1 0 0 0 0 0.16 0 0 0 0.35 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
	}
	section,
	.intro {
		max-width: 920px;
		margin: 0 auto 56px;
		position: relative;
		z-index: 1;
	}
	.kicker {
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		opacity: 0.6;
	}
	.display {
		font-family: var(--display);
		font-variation-settings:
			'SOFT' 100,
			'WONK' 1;
		font-weight: 800;
		line-height: 0.9;
		letter-spacing: -0.02em;
	}
	.intro h1 {
		font-size: clamp(48px, 13vw, 96px);
		margin: 8px 0 14px;
	}
	.display i,
	.intro h1 i {
		font-style: italic;
		font-weight: 500;
		color: var(--pink);
	}
	.lede {
		font-size: 18px;
		line-height: 1.45;
		max-width: 36em;
	}
	.section-title {
		font-family: var(--display);
		font-size: 26px;
		font-weight: 700;
		margin-bottom: 16px;
		display: flex;
		align-items: baseline;
		gap: 10px;
	}
	.section-title span {
		font-family: var(--ui);
		font-size: 13px;
		font-weight: 800;
		letter-spacing: 0.1em;
		padding: 2px 8px;
		border: 1.5px solid var(--ink);
		border-radius: 999px;
	}
	.note {
		margin-top: 14px;
		font-size: 15px;
		line-height: 1.45;
		opacity: 0.75;
		max-width: 34em;
	}

	/* Phone mock */
	.phone {
		position: relative;
		width: min(390px, 100%);
		height: 760px;
		border: 2.5px solid var(--ink);
		border-radius: 40px;
		overflow: hidden;
		box-shadow: 6px 6px 0 var(--ink);
		background: var(--paper);
	}
	.phone-map {
		position: absolute;
		inset: 0;
	}
	.phone-top {
		position: absolute;
		inset: 0 0 auto;
		padding: 18px 14px 10px;
		background: linear-gradient(var(--paper) 72%, transparent);
		z-index: 2;
	}
	.owner {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.avatar {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border-radius: 50%;
		border: 2px solid var(--ink);
		background: var(--pink);
		color: var(--surface);
		font-family: var(--display);
		font-weight: 800;
		font-size: 22px;
	}
	.owner-of {
		font-size: 12px;
		font-weight: 800;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		line-height: 1;
	}
	.owner-city {
		font-family: var(--display);
		font-variation-settings:
			'SOFT' 100,
			'WONK' 1;
		font-size: 34px;
		font-weight: 800;
		line-height: 0.95;
		letter-spacing: -0.02em;
	}
	.owner-actions {
		margin-left: auto;
		display: flex;
		gap: 8px;
	}
	.owner-meta {
		margin: 6px 0 10px;
		font-size: 14px;
		font-weight: 600;
		opacity: 0.75;
	}
	.icon-btn {
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		border: 1.5px solid var(--ink);
		background: var(--surface);
		font-weight: 800;
		font-size: 17px;
	}
	.icon-btn.solid {
		background: var(--ink);
		color: var(--paper);
	}
	.chips {
		display: flex;
		gap: 6px;
		overflow-x: auto;
		scrollbar-width: none;
	}
	.chip {
		flex: none;
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 6px 12px;
		border-radius: 999px;
		border: 1.5px solid var(--ink);
		background: var(--surface);
		font-size: 14px;
		font-weight: 700;
		white-space: nowrap;
	}
	.chip span {
		font-size: 11px;
		opacity: 0.55;
	}
	.chip.on {
		background: var(--ink);
		color: var(--paper);
	}
	.chip.ask {
		background: var(--pink);
		color: var(--ink);
		border-color: var(--ink);
	}
	.phone-bottom {
		position: absolute;
		inset: auto 0 0;
		padding: 0 12px 14px;
		z-index: 2;
	}
	.dock {
		margin-top: 10px;
		display: flex;
		gap: 8px;
	}
	.dock-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 10px 14px;
		border-radius: 999px;
		border: 1.5px solid var(--ink);
		background: var(--surface);
		font-weight: 800;
		font-size: 14px;
	}
	.dock-btn.primary {
		flex: 1;
		justify-content: center;
		background: var(--ink);
		color: var(--paper);
	}

	/* Cards */
	.card {
		display: flex;
		min-height: 168px;
		border: 2px solid var(--ink);
		border-radius: 22px;
		background: var(--surface);
		overflow: hidden;
		box-shadow: 4px 4px 0 var(--spot);
	}
	.card-art {
		flex: none;
		width: 92px;
		display: grid;
		place-items: center;
		background: color-mix(in srgb, var(--spot) 22%, var(--paper));
		border-right: 2px solid var(--ink);
	}
	.card-body {
		flex: 1;
		min-width: 0;
		padding: 12px 14px;
		display: flex;
		flex-direction: column;
	}
	.card-kicker {
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		opacity: 0.6;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.card-name {
		font-family: var(--display);
		font-variation-settings:
			'SOFT' 100,
			'WONK' 1;
		font-size: 25px;
		font-weight: 800;
		line-height: 1;
		margin: 3px 0 6px;
		letter-spacing: -0.01em;
	}
	.card-tip {
		font-size: 14.5px;
		line-height: 1.35;
		font-weight: 500;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.card-tip.muted {
		opacity: 0.55;
		font-style: italic;
	}
	.card-actions {
		margin-top: auto;
		padding-top: 10px;
		display: flex;
		gap: 8px;
	}
	.btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 8px 14px;
		border-radius: 999px;
		font-weight: 800;
		font-size: 14px;
		border: 1.5px solid var(--ink);
	}
	.btn.ink {
		background: var(--ink);
		color: var(--paper);
	}
	.card-row {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 16px;
	}
	.card.photo .photo-fill {
		flex: none;
		width: 120px;
		position: relative;
		border-right: 2px solid var(--ink);
		background:
			radial-gradient(circle at 30% 30%, #ffd9a3, transparent 55%),
			linear-gradient(135deg, #b5651d, #5a2e12);
	}
	.photo-badge {
		position: absolute;
		left: 8px;
		top: 8px;
		width: 44px;
		height: 44px;
		display: grid;
		place-items: center;
		background: var(--surface);
		border: 1.5px solid var(--ink);
		border-radius: 50%;
	}

	/* Icons */
	.icon-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
		gap: 10px;
	}
	.icon-grid figure {
		display: grid;
		justify-items: center;
		gap: 4px;
		padding: 12px 6px;
		border: 1.5px solid var(--ink);
		border-radius: 18px;
		background: var(--surface);
	}
	.icon-grid figcaption {
		font-size: 12.5px;
		font-weight: 700;
		text-align: center;
	}
	.compare {
		margin-top: 18px;
		display: grid;
		gap: 14px;
	}
	.compare-label {
		font-size: 13px;
		font-weight: 800;
		opacity: 0.6;
		margin-bottom: 4px;
	}
	.emoji-row {
		font-size: 30px;
		letter-spacing: 4px;
	}
	.ui-row {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}
	.ui-icon {
		display: grid;
		place-items: center;
		width: 46px;
		height: 46px;
		border: 1.5px solid var(--ink);
		border-radius: 50%;
		background: var(--surface);
	}

	/* Story poster (9:16) */
	.story {
		position: relative;
		width: min(360px, 100%);
		aspect-ratio: 9 / 16;
		padding: 26px 22px 18px;
		background: var(--paper);
		border: 2px solid var(--ink);
		border-radius: 18px;
		box-shadow: 6px 6px 0 var(--pink);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
	.story-of {
		font-size: 14px;
		font-weight: 800;
		letter-spacing: 0.16em;
		text-transform: uppercase;
	}
	.story-city {
		font-family: var(--display);
		font-variation-settings:
			'SOFT' 100,
			'WONK' 1;
		font-size: 62px;
		font-weight: 900;
		line-height: 0.85;
		letter-spacing: -0.03em;
	}
	.story-sub {
		font-family: var(--display);
		font-style: italic;
		font-size: 18px;
		margin: 6px 0 14px;
		color: #c2187a;
	}
	.story-map {
		position: relative;
		flex: 1;
		min-height: 0;
		border: 2px solid var(--ink);
		border-radius: 14px;
		background: #efe2c4;
		overflow: hidden;
	}
	.story-roads {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}
	.story-roads path {
		fill: none;
		stroke: #f3dfb4;
		stroke-width: 4;
		vector-effect: non-scaling-stroke;
	}
	.story-roads path.thin {
		stroke-width: 2;
	}
	.story-lake,
	.story-park {
		position: absolute;
		width: 70px;
		height: 44px;
		border-radius: 50%;
		background: #8dbdeb;
		transform: translate(-50%, -50%) rotate(-12deg);
	}
	.story-park {
		background: #b9d89c;
		width: 80px;
	}
	.story-pin {
		position: absolute;
		transform: translate(-50%, -50%);
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: var(--surface);
		border: 1.5px solid var(--ink);
	}
	.story-list {
		margin: 12px 0 8px;
		display: grid;
		gap: 4px;
		font-size: 14px;
	}
	.story-list li {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.story-n {
		font-family: var(--display);
		font-weight: 800;
		width: 14px;
	}
	.story-list em {
		opacity: 0.6;
		font-size: 12px;
	}
	.story-foot {
		font-size: 11.5px;
		font-weight: 800;
		letter-spacing: 0.06em;
		opacity: 0.7;
	}

	/* Type & colour */
	.type-sheet .big {
		font-size: clamp(40px, 10vw, 72px);
	}
	.ui-text {
		margin-top: 10px;
		font-size: 17px;
		max-width: 32em;
	}
	.swatches {
		margin-top: 18px;
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
	}
	.swatch span {
		display: block;
		width: 64px;
		height: 64px;
		border-radius: 14px;
		border: 1.5px solid var(--ink);
	}
	.swatch p {
		font-size: 12px;
		font-weight: 700;
		margin-top: 4px;
	}

	/* Poster clusters: a paper disc with the count set in the headline serif. */
	.phone :global(.pin-cluster .pin-body) {
		width: 46px;
		height: 46px;
		background: #fffdf6;
		border: 2px solid #1f1a2e;
		box-shadow: 3px 3px 0 #ff48b0;
	}
	.phone :global(.pin-count) {
		font:
			800 20px 'Fraunces Variable',
			Georgia,
			serif;
	}

	/* Poster pins on the live map (markup comes from pinMarkup). */
	:global(.ppin) {
		display: flex;
		flex-direction: column;
		align-items: center;
		transform-origin: 50% 100%;
	}
	:global(.ppin-badge) {
		display: grid;
		place-items: center;
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: #fffdf6;
		border: 2px solid #1f1a2e;
		box-shadow: 3px 3px 0 var(--spot);
		transition: transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	:global(.ppin-name) {
		display: none;
		margin-top: 4px;
		padding: 2px 8px;
		border-radius: 999px;
		background: #1f1a2e;
		color: #f4ead5;
		font:
			800 12px 'Bricolage Grotesque Variable',
			system-ui,
			sans-serif;
		white-space: nowrap;
	}
	:global(.pin.is-selected .ppin-badge) {
		transform: scale(1.18);
	}
	:global(.pin.is-selected .ppin-name) {
		display: block;
	}
</style>
