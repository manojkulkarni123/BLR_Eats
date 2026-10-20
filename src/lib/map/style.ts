import type { FilterSpecification, StyleSpecification } from 'maplibre-gl';
import type { Theme } from '#lib/theme.ts';

// OpenFreeMap serves OpenMapTiles vector tiles and fonts with no API key.
// We draw only a few layers, in theme colours, with few labels: the map is a
// colourful backdrop for the pins, not a navigation map.
const TILES = 'https://tiles.openfreemap.org/planet';
const GLYPHS = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';

export function buildMapStyle(theme: Theme): StyleSpecification {
	const m = theme.map;
	const road = (classes: string[]): FilterSpecification => [
		'match',
		['get', 'class'],
		classes,
		true,
		false
	];

	return {
		version: 8,
		glyphs: GLYPHS,
		sources: { omt: { type: 'vector', url: TILES } },
		layers: [
			{ id: 'land', type: 'background', paint: { 'background-color': m.land } },
			{
				id: 'residential',
				type: 'fill',
				source: 'omt',
				'source-layer': 'landuse',
				filter: ['in', ['get', 'class'], ['literal', ['residential', 'suburb', 'neighbourhood']]],
				paint: { 'fill-color': m.residential }
			},
			{
				id: 'wood',
				type: 'fill',
				source: 'omt',
				'source-layer': 'landcover',
				filter: ['in', ['get', 'class'], ['literal', ['wood', 'grass']]],
				paint: { 'fill-color': m.wood, 'fill-opacity': 0.85 }
			},
			{
				id: 'park',
				type: 'fill',
				source: 'omt',
				'source-layer': 'park',
				paint: { 'fill-color': m.park }
			},
			{
				id: 'water',
				type: 'fill',
				source: 'omt',
				'source-layer': 'water',
				paint: { 'fill-color': m.water }
			},
			{
				id: 'waterway',
				type: 'line',
				source: 'omt',
				'source-layer': 'waterway',
				paint: {
					'line-color': m.water,
					'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1, 16, 4]
				}
			},
			{
				id: 'building',
				type: 'fill',
				source: 'omt',
				'source-layer': 'building',
				minzoom: 14,
				paint: { 'fill-color': m.building }
			},
			{
				id: 'road-minor',
				type: 'line',
				source: 'omt',
				'source-layer': 'transportation',
				filter: road(['minor', 'service', 'tertiary']),
				layout: { 'line-cap': 'round', 'line-join': 'round' },
				paint: {
					'line-color': m.roadMinor,
					'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 12, 0.5, 18, 10]
				}
			},
			{
				id: 'road-major-casing',
				type: 'line',
				source: 'omt',
				'source-layer': 'transportation',
				filter: road(['primary', 'secondary', 'trunk']),
				layout: { 'line-cap': 'round', 'line-join': 'round' },
				paint: {
					'line-color': m.roadMajorCasing,
					'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 10, 1.5, 18, 22]
				}
			},
			{
				id: 'road-major',
				type: 'line',
				source: 'omt',
				'source-layer': 'transportation',
				filter: road(['primary', 'secondary', 'trunk']),
				layout: { 'line-cap': 'round', 'line-join': 'round' },
				paint: {
					'line-color': m.roadMajor,
					'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 10, 0.8, 18, 18]
				}
			},
			{
				id: 'motorway',
				type: 'line',
				source: 'omt',
				'source-layer': 'transportation',
				filter: road(['motorway']),
				layout: { 'line-cap': 'round', 'line-join': 'round' },
				paint: {
					'line-color': m.motorway,
					'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 10, 1.2, 18, 22]
				}
			},
			{
				id: 'area-labels',
				type: 'symbol',
				source: 'omt',
				'source-layer': 'place',
				filter: ['in', ['get', 'class'], ['literal', ['suburb', 'neighbourhood', 'quarter']]],
				minzoom: 11,
				layout: {
					'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
					'text-font': ['Noto Sans Bold'],
					'text-size': ['interpolate', ['linear'], ['zoom'], 11, 10, 15, 14],
					'text-transform': 'uppercase',
					'text-letter-spacing': 0.08,
					'text-max-width': 8,
					// Generous spacing so only a few area names show: a backdrop, not a street map.
					'text-padding': 40
				},
				paint: {
					'text-color': m.label,
					'text-opacity': 0.4,
					'text-halo-color': m.labelHalo,
					'text-halo-width': 1.5
				}
			}
		]
	};
}
