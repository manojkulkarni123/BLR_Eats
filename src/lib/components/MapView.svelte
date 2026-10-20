<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import type { Map as MlMap, Marker } from 'maplibre-gl';
	import type Supercluster from 'supercluster';
	import { buildMapStyle } from '#lib/map/style.ts';
	import { swatchFor, type Theme } from '#lib/theme.ts';
	import type { Spot } from '#lib/types.ts';

	type Props = {
		theme: Theme;
		/** Spots drawn as pins. */
		spots: Spot[];
		/** Spots the camera fits; a new set re-frames the map. */
		frame: Spot[];
		emojiFor: (spot: Spot) => string;
		selectedId: string | null;
		/** Bump `nonce` to move the camera to a spot. */
		focus: { id: string; nonce: number } | null;
		userLocation: { lat: number; lng: number } | null;
		onselect: (id: string) => void;
		onready?: () => void;
		/** The map's centre after each move, for place search bias and pin dropping. */
		onmove?: (centre: { lat: number; lng: number }) => void;
		/** A spot pop-up covers the lower part of the screen: keep spots above it. */
		sheetOpen?: boolean;
	};

	let {
		theme,
		spots,
		frame,
		emojiFor,
		selectedId,
		focus,
		userLocation,
		onselect,
		onready,
		onmove,
		sheetOpen = false
	}: Props = $props();

	let container: HTMLDivElement;
	let map: MlMap | null = $state(null);
	let ml: typeof import('maplibre-gl') | null = null;
	let index: Supercluster | null = null;
	// Imperative MapLibre markers, not UI state.
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	const markers = new Map<string, { marker: Marker; el: HTMLElement }>();
	let youMarker: Marker | null = null;
	let popOrder = 0;

	const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
	// Room for the header (top) and the card rail or spot pop-up (bottom).
	const padding = () => ({
		top: 150,
		bottom: sheetOpen ? Math.round(container.clientHeight * 0.6) : 270,
		left: 48,
		right: 48
	});

	function bounds(list: Spot[]) {
		const lngs = list.map((s) => s.lng);
		const lats = list.map((s) => s.lat);
		return [
			[Math.min(...lngs), Math.min(...lats)],
			[Math.max(...lngs), Math.max(...lats)]
		] as [[number, number], [number, number]];
	}

	function frameSpots(list: Spot[], animate: boolean) {
		if (!map || list.length === 0) return;
		const duration = animate && !reducedMotion() ? 800 : 0;
		if (list.length === 1) {
			map.easeTo({ center: [list[0].lng, list[0].lat], zoom: 15, padding: padding(), duration });
		} else {
			map.fitBounds(bounds(list), { padding: padding(), maxZoom: 15, duration });
		}
	}

	function pinElement(spot: Spot): HTMLElement {
		const { bg, on } = swatchFor(theme, spot.category);
		const el = document.createElement('button');
		el.type = 'button';
		el.className = 'pin';
		el.style.setProperty('--bg', bg);
		el.style.setProperty('--on', on);
		el.setAttribute('aria-label', spot.name);
		el.innerHTML = `<span class="pin-pop"><span class="pin-body"><span class="pin-emoji">${emojiFor(spot)}</span></span></span>`;
		el.addEventListener('click', (e) => {
			e.stopPropagation();
			onselect(spot.id);
		});
		return el;
	}

	function clusterElement(count: number, clusterId: number, lng: number, lat: number): HTMLElement {
		const el = document.createElement('button');
		el.type = 'button';
		el.className = 'pin pin-cluster';
		el.setAttribute('aria-label', `${count} spots, zoom in`);
		el.innerHTML = `<span class="pin-pop"><span class="pin-body"><span class="pin-count">${count}</span></span></span>`;
		el.addEventListener('click', (e) => {
			e.stopPropagation();
			const zoom = Math.min(index!.getClusterExpansionZoom(clusterId), 17);
			map?.easeTo({ center: [lng, lat], zoom, duration: reducedMotion() ? 0 : 500 });
		});
		return el;
	}

	function renderMarkers() {
		if (!map || !ml || !index) return;
		const b = map.getBounds();
		const features = index.getClusters(
			[b.getWest() - 0.05, b.getSouth() - 0.05, b.getEast() + 0.05, b.getNorth() + 0.05],
			Math.round(map.getZoom())
		);
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- local scratch set
		const seen = new Set<string>();

		for (const f of features) {
			const [lng, lat] = f.geometry.coordinates;
			const props = f.properties as {
				cluster?: boolean;
				cluster_id?: number;
				point_count?: number;
				id?: string;
			};
			const key = props.cluster ? `c:${props.cluster_id}:${props.point_count}` : `s:${props.id}`;
			seen.add(key);
			if (markers.has(key)) continue;

			const el = props.cluster
				? clusterElement(props.point_count!, props.cluster_id!, lng, lat)
				: pinElement(spots.find((s) => s.id === props.id)!);
			// Staggered pop-in, capped so the whole entrance stays around a second.
			(el.firstElementChild as HTMLElement).style.animationDelay =
				`${Math.min(popOrder++ * 70, 700)}ms`;
			const marker = new ml.Marker({ element: el, anchor: 'bottom' })
				.setLngLat([lng, lat])
				.addTo(map);
			markers.set(key, { marker, el });
		}

		for (const [key, { marker }] of markers) {
			if (!seen.has(key)) {
				marker.remove();
				markers.delete(key);
			}
		}
		syncSelected();
	}

	function syncSelected() {
		for (const [key, { el }] of markers) {
			el.classList.toggle('is-selected', key === `s:${selectedId}`);
		}
	}

	async function loadIndex(list: Spot[]) {
		const { default: SC } = await import('supercluster');
		index = new SC({ radius: 34, maxZoom: 16 });
		index.load(
			list.map((s) => ({
				type: 'Feature' as const,
				properties: { id: s.id },
				geometry: { type: 'Point' as const, coordinates: [s.lng, s.lat] }
			}))
		);
	}

	// What a pin's look and position depend on, so edits redraw it too (not just adds and removes).
	const pinsKey = (list: Spot[]) =>
		list.map((s) => `${s.id}:${s.category}:${s.customCategoryId}:${s.lat}:${s.lng}`).join(',');
	const frameKey = (list: Spot[]) => list.map((s) => s.id).join(',');
	// The sets drawn and framed when the map was created; `null` until then.
	let lastSpotsKey: string | null = null;
	let lastFrameKey: string | null = null;

	onMount(() => {
		let cancelled = false;
		lastSpotsKey = pinsKey(spots);
		lastFrameKey = frameKey(frame);
		(async () => {
			const [maplibre, worker] = await Promise.all([
				import('maplibre-gl'),
				// MapLibre computes its worker URL at runtime, which bundlers can't follow.
				import('maplibre-gl/dist/maplibre-gl-worker.mjs?url'),
				import('maplibre-gl/dist/maplibre-gl.css'),
				loadIndex(spots)
			]);
			if (cancelled) return;
			ml = maplibre;
			ml.setWorkerUrl(worker.default);
			const first = frame.length ? frame : spots;
			map = new ml.Map({
				container,
				style: buildMapStyle(theme),
				// One spot is a zero-size box: fitting it applies maxZoom and the padding.
				bounds: first.length ? bounds(first) : undefined,
				center: [77.5946, 12.9716],
				zoom: 11,
				fitBoundsOptions: { padding: padding(), maxZoom: 15 },
				attributionControl: { compact: true },
				dragRotate: false,
				pitchWithRotate: false,
				touchPitch: false
			});
			map.touchZoomRotate.disableRotation();
			map.on('load', () => {
				// Start with the credit collapsed to its (i) button; it opens on tap.
				container
					.querySelector('.maplibregl-ctrl-attrib')
					?.classList.remove('maplibregl-compact-show');
				renderMarkers();
				onready?.();
			});
			// The point under the middle of the screen. Not getCenter(): camera padding shifts that.
			const reportCentre = () => {
				const c = map!.unproject([container.clientWidth / 2, container.clientHeight / 2]);
				onmove?.({ lat: c.lat, lng: c.lng });
			};
			map.on('load', reportCentre);
			map.on('moveend', () => {
				renderMarkers();
				reportCentre();
			});
		})();
		return () => {
			cancelled = true;
			map?.remove();
		};
	});

	// Pins changed (filter, add, edit, delete): rebuild clusters and pop them in again.
	$effect(() => {
		const key = pinsKey(spots);
		if (!map || key === lastSpotsKey) return;
		lastSpotsKey = key;
		loadIndex(spots).then(() => {
			for (const { marker } of markers.values()) marker.remove();
			markers.clear();
			popOrder = 0;
			renderMarkers();
		});
	});

	$effect(() => {
		const key = frameKey(frame);
		if (!map || key === lastFrameKey) return;
		lastFrameKey = key;
		frameSpots(frame, true);
	});

	$effect(() => {
		void selectedId;
		syncSelected();
	});

	$effect(() => {
		if (!map || !focus) return;
		const id = focus.id;
		const spot = untrack(() => spots.find((s) => s.id === id));
		if (!spot) return;
		map.easeTo({
			center: [spot.lng, spot.lat],
			zoom: Math.max(map.getZoom(), 14.5),
			padding: padding(),
			duration: reducedMotion() ? 0 : 650
		});
	});

	$effect(() => {
		if (!map || !ml || !userLocation) return;
		youMarker?.remove();
		const el = document.createElement('div');
		el.className = 'you-dot';
		youMarker = new ml.Marker({ element: el })
			.setLngLat([userLocation.lng, userLocation.lat])
			.addTo(map);
		const here = userLocation;
		const nearest = untrack(() => [...spots])
			.sort(
				(a, b) =>
					Math.hypot(a.lat - here.lat, a.lng - here.lng) -
					Math.hypot(b.lat - here.lat, b.lng - here.lng)
			)
			.slice(0, 3);
		const pts = [...nearest.map((s) => [s.lng, s.lat]), [userLocation.lng, userLocation.lat]];
		const lngs = pts.map((p) => p[0]);
		const lats = pts.map((p) => p[1]);
		map.fitBounds(
			[
				[Math.min(...lngs), Math.min(...lats)],
				[Math.max(...lngs), Math.max(...lats)]
			],
			{ padding: padding(), maxZoom: 15, duration: reducedMotion() ? 0 : 800 }
		);
	});
</script>

<div bind:this={container} class="map-root" aria-label="Food map"></div>

<style>
	.map-root {
		position: absolute;
		inset: 0;
		background: var(--map-land);
	}

	:global(.pin) {
		display: block;
		padding: 0;
		border: 0;
		background: none;
		cursor: pointer;
	}
	:global(.pin-pop) {
		display: block;
		padding-bottom: 9px;
		animation: pop-in 420ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
		transform-origin: 50% 100%;
	}
	:global(.pin-body) {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border-radius: 50% 50% 50% 6px;
		transform: rotate(-45deg);
		background: var(--bg);
		border: 2.5px solid var(--ink);
		box-shadow: 3px 3px 0 var(--ink);
		transition: transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	:global(.pin-emoji),
	:global(.pin-count) {
		transform: rotate(45deg);
		font-size: 22px;
		line-height: 1;
	}
	:global(.pin.is-selected) {
		z-index: 2;
	}
	:global(.pin.is-selected .pin-body) {
		transform: rotate(-45deg) scale(1.3);
	}
	:global(.pin:active .pin-body) {
		transform: rotate(-45deg) scale(0.92);
	}
	:global(.pin-cluster .pin-body) {
		width: 50px;
		height: 50px;
		border-radius: 50%;
		background: var(--surface);
		box-shadow:
			3px 3px 0 var(--ink),
			7px 7px 0 -2px var(--sun),
			7px 7px 0 0 var(--ink);
	}
	:global(.pin-count) {
		font-weight: 800;
		font-size: 19px;
		color: var(--ink);
	}
	:global(.you-dot) {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: var(--accent);
		border: 3px solid var(--surface);
		box-shadow: 0 0 0 6px color-mix(in srgb, var(--accent) 30%, transparent);
	}
	:global(.maplibregl-ctrl-attrib) {
		font-family: system-ui, sans-serif;
	}
	/* Keep the map credit clear of the card rail: just under the filter chips. */
	:global(.maplibregl-ctrl-bottom-right) {
		top: calc(120px + env(safe-area-inset-top));
		bottom: auto;
	}
</style>
