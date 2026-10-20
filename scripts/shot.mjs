// Phone-sized screenshot using the system Edge browser (no browser download).
// Usage: node scripts/shot.mjs <url> <out.png> [waitMs] [actionJs]
// actionJs runs with `page` in scope, e.g. "await page.click('text=Cafés')".
import { chromium, devices } from 'playwright-core';

const [url, out, wait = '6000', action = ''] = process.argv.slice(2);
const browser = await chromium.launch({
	channel: 'msedge',
	args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
const page = await (await browser.newContext({ ...devices['Pixel 7'] })).newPage();
const logs = [];
page.on(
	'console',
	(m) => ['error', 'warning'].includes(m.type()) && logs.push(`${m.type()}: ${m.text()}`)
);
page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
page.on('requestfailed', (r) => logs.push(`failed: ${r.url()} ${r.failure()?.errorText}`));

await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(Number(wait));
if (action) {
	await new Function('page', `return (async () => { ${action} })()`)(page);
	await page.waitForTimeout(2500);
}
await page.screenshot({ path: out });
console.log(logs.slice(0, 15).join('\n') || 'no console errors');
await browser.close();
