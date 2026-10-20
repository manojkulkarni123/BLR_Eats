// Renders the app icons from static/icon.svg. Run: node scripts/icons.mjs
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'node:fs';

const svg = readFileSync('static/icon.svg', 'utf8');
for (const [name, size] of [
	['icon-192.png', 192],
	['icon-512.png', 512],
	['apple-touch-icon.png', 180]
]) {
	writeFileSync(
		`static/${name}`,
		new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng()
	);
	console.log(`static/${name}`);
}
