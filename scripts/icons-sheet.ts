import { Resvg } from '@resvg/resvg-js';
import { writeFileSync } from 'node:fs';
import { ICONS, iconSvg, type IconKey } from '../src/lib/icons.ts';

const spot: Record<string, string> = {
	'south-indian': '#FFE800',
	biryani: '#FF6C2F',
	'north-indian': '#914E72',
	chinese: '#00838A',
	asian: '#FF48B0',
	burgers: '#FFB511',
	pizza: '#FF665E',
	italian: '#00A95C',
	'street-food': '#765BA7',
	cafes: '#925F52',
	desserts: '#62A8E5',
	bars: '#0078BF',
	spot: '#F4EAD5'
};
const keys = Object.keys(ICONS) as IconKey[];
const cell = 150;
const cols = 5;
const rows = Math.ceil(keys.length / cols);
const parts = keys.map((k, i) => {
	const x = (i % cols) * cell + 15,
		y = Math.floor(i / cols) * cell + 10;
	const svg = iconSvg(
		k,
		{ spot: spot[k], ink: '#1F1A2E', paper: '#FFFDF6', cream: '#F4D9A0' },
		110
	).replace('<svg ', `<svg x="${x + 5}" y="${y}" `);
	return (
		svg +
		`<text x="${x + 60}" y="${y + 128}" font-family="Arial" font-size="14" text-anchor="middle" fill="#1F1A2E">${k}</text>`
	);
});
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${cols * cell}" height="${rows * cell}"><rect width="100%" height="100%" fill="#F4EAD5"/>${parts.join('')}</svg>`;
writeFileSync(process.argv[2], new Resvg(sheet).render().asPng());
