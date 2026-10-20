// Full owner journey in a phone-sized browser, using an admin-generated sign-in link
// (no email needed): sign in → pick handle → bulk add → celebration → add one spot.
// Usage: node --env-file=.env scripts/e2e-signup.mjs <outDir>
import { chromium, devices } from 'playwright-core';
import { createClient } from '@supabase/supabase-js';

const out = process.argv[2] ?? '.';
const base = process.env.BASE_URL ?? 'http://localhost:5173';
const admin = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
	auth: { persistSession: false }
});
const email = `e2e-${Date.now()}@example.com`;
const handle = `e2e${String(Date.now()).slice(-6)}`;

const user = (await admin.auth.admin.createUser({ email, email_confirm: true })).data.user;
const link = (await admin.auth.admin.generateLink({ type: 'magiclink', email })).data;

const browser = await chromium.launch({
	channel: 'msedge',
	args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
const page = await (await browser.newContext({ ...devices['Pixel 7'] })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const shot = (n) => page.screenshot({ path: `${out}/e2e-${n}.png` });
const step = (s) => console.log(`✓ ${s}`);

try {
	await page.goto(`${base}/auth/callback?token_hash=${link.properties.hashed_token}&type=email`);
	await page.waitForURL('**/welcome');
	step('signed in via link → /welcome');
	await page.waitForLoadState('networkidle');

	await page.fill('input[name=name]', 'E2E Tester');
	await page.fill('input[name=handle]', handle);
	await shot('1-welcome');
	await page.click('button:has-text("Make my map")');
	await page.waitForURL(`**/${handle}**`);
	await page.getByText('Add your top spots').first().waitFor();
	step('handle created → top spots sheet open');

	for (const q of ['CTR Malleswaram', 'Meghana Foods', 'Toit Indiranagar']) {
		await page.fill('input[placeholder^="Search a place"]', q);
		await page.locator('li button', { hasText: '＋' }).first().waitFor({ timeout: 10000 });
		await page.locator('li button', { hasText: '＋' }).first().click();
		await page.waitForTimeout(300);
	}
	await shot('2-top-spots');
	step('picked 3 places from search');

	await page.click('button:has-text("Done, show my map")');
	await page.getByText(/Your map has \d+ spots/).waitFor({ timeout: 15000 });
	await page.waitForTimeout(1500);
	await shot('3-celebrate');
	step('saved → celebration shown');

	await page.click('button:has-text("Look around first")');
	await page.waitForTimeout(2500);
	await shot('4-my-map');
	// Regression: pins added to an empty map must draw without a reload.
	const pins = await page.locator('.pin').count();
	if (pins === 0) throw new Error('no pins drawn after adding the first spots');
	step(`${pins} pin(s) drawn after first add`);

	await page.click('button:has-text("＋ Add spot")');
	await page.fill('input[placeholder^="Search a place"]', 'Corner House');
	await page.locator('li button', { hasText: '＋' }).first().waitFor({ timeout: 10000 });
	await page.locator('li button', { hasText: '＋' }).first().click();
	await page.fill('textarea', 'Death by Chocolate. Non-negotiable.');
	await shot('5-add-spot');
	await page.click('button:has-text("Add to my map")');
	await page.getByText(/Spot #\d+ added/).waitFor({ timeout: 15000 });
	await page.waitForTimeout(1500);
	await shot('6-added');
	step('added a single spot with a recommendation');

	const { data: spots } = await admin
		.from('spots')
		.select('name, area, category, recommendation')
		.eq('owner_id', user.id);
	console.log('DB rows:', JSON.stringify(spots));

	// A logged-out visitor sees the same map.
	const visitor = await (await browser.newContext({ ...devices['Pixel 7'] })).newPage();
	await visitor.goto(`${base}/${handle}`);
	await visitor.waitForTimeout(5000);
	await visitor.screenshot({ path: `${out}/e2e-7-visitor.png` });
	step(`visitor view of /${handle}`);
} catch (e) {
	await shot('error');
	console.error('FAILED:', e.message);
	process.exitCode = 1;
} finally {
	console.log(errors.length ? `page errors:\n${errors.slice(0, 10).join('\n')}` : 'no page errors');
	await browser.close();
	await admin.auth.admin.deleteUser(user.id);
}
