// Step 1 of refreshing the place index: pull Bangalore food places and neighbourhood
// names out of Overture Maps (open data from Meta, Microsoft, Foursquare and others;
// CDLA Permissive 2.0). DuckDB reads only the row groups inside the Bangalore box, over
// HTTPS, so this takes under a minute. Step 2 is scripts/load-places.mjs.
// Usage: node scripts/overture-places.mjs <out.json> [release, e.g. 2026-09-23.1]
// Releases: https://docs.overturemaps.org/release/latest/
import { DuckDBInstance } from '@duckdb/node-api';
import { writeFileSync } from 'node:fs';

const out = process.argv[2] ?? 'overture-blr.json';
const release = process.argv[3] ?? '2026-09-23.1';
const host = 'https://overturemapswestus2.blob.core.windows.net/release';

// Same box as src/lib/places.ts.
const inBox = `bbox.xmin BETWEEN 77.35 AND 77.85 AND bbox.ymin BETWEEN 12.75 AND 13.25`;

async function files(theme, type) {
	const names = [];
	let marker = '';
	do {
		const prefix = `${release}/theme=${theme}/type=${type}/`;
		const url = `${host}?restype=container&comp=list&prefix=${prefix}${marker && `&marker=${marker}`}`;
		const xml = await (await fetch(url)).text();
		names.push(...[...xml.matchAll(/<Name>([^<]+\.parquet)<\/Name>/g)].map((m) => m[1]));
		marker = xml.match(/<NextMarker>([^<]+)<\/NextMarker>/)?.[1] ?? '';
	} while (marker);
	if (!names.length) throw new Error(`No ${theme}/${type} files for release ${release}`);
	return names.map((n) => `'${host}/${n}'`).join(',');
}

const db = await (await DuckDBInstance.create()).connect();
await db.run('INSTALL httpfs; LOAD httpfs;');
const t0 = Date.now();

const places = (
	await db.runAndReadAll(`
		SELECT
			id,
			names.primary AS name,
			taxonomy.primary AS kind,
			confidence,
			coalesce(addresses[1].freeform, '') AS address,
			bbox.ymin AS lat,
			bbox.xmin AS lng
		FROM read_parquet([${await files('places', 'place')}])
		WHERE ${inBox}
			AND names.primary IS NOT NULL
			AND (taxonomy.hierarchy[1] = 'food_and_drink' OR taxonomy.primary = 'patisserie_cake_shop')
			AND taxonomy.primary IS DISTINCT FROM 'internet_cafe'
			AND operating_status IS DISTINCT FROM 'permanently_closed'
	`)
).getRowObjectsJson();

// Neighbourhood points, to name each place's area ("Koramangala", "HSR Layout").
const areas = (
	await db.runAndReadAll(`
		SELECT names.primary AS name, subtype, bbox.ymin AS lat, bbox.xmin AS lng
		FROM read_parquet([${await files('divisions', 'division')}])
		WHERE ${inBox} AND subtype IN ('neighborhood', 'macrohood') AND names.primary IS NOT NULL
	`)
).getRowObjectsJson();

writeFileSync(out, JSON.stringify({ release, places, areas }));
console.log(
	`${places.length} food places, ${areas.length} areas from ${release} in ${Math.round((Date.now() - t0) / 1000)} s → ${out}`
);
