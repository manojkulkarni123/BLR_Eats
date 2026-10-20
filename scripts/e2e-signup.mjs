// Full owner journey in a phone-sized browser, using an admin-generated sign-in link
// (no email needed): sign in → pick handle → bulk add → celebration → add one spot.
// Usage: node --env-file=.env scripts/e2e-signup.mjs <outDir>
import { chromium, devices } from 'playwright-core';
import { createClient } from '@supabase/supabase-js';
import { Resvg } from '@resvg/resvg-js';

// Two test photos, drawn on the fly.
const photo = (fill, label) => ({
	name: `${label}.png`,
	mimeType: 'image/png',
	buffer: new Resvg(
		`<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='900'><rect width='1200' height='900' fill='${fill}'/><circle cx='600' cy='450' r='260' fill='#fff3d6'/></svg>`
	)
		.render()
		.asPng()
});

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
// Standing on 80 Feet Road, Koramangala, for the "I'm here right now" flow.
const page = await (
	await browser.newContext({
		...devices['Pixel 7'],
		geolocation: { latitude: 12.9346, longitude: 77.6142 },
		permissions: ['geolocation']
	})
).newPage();
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
	await page.setInputFiles('input[type=file]', [photo('#FF3D7F', 'one'), photo('#3A86FF', 'two')]);
	await shot('5-add-spot');
	await page.click('button:has-text("Add to my map")');
	await page.getByText(/Spot #\d+ added/).waitFor({ timeout: 15000 });
	await page.waitForTimeout(1500);
	await shot('6-added');
	step('added a single spot with a recommendation and 2 photos');

	// The spot pop-up shows every photo; tapping one opens the full-screen viewer.
	await page
		.locator('[data-id] article', { hasText: 'Corner House' })
		.locator('button')
		.first()
		.click();
	await page.getByRole('dialog', { name: 'Corner House' }).waitFor();
	await page.waitForTimeout(1500);
	const photosInSheet = await page.locator('[role=dialog] img[alt^="Corner House, photo"]').count();
	if (photosInSheet !== 2) throw new Error(`expected 2 photos in the pop-up, got ${photosInSheet}`);
	await shot('6b-sheet');
	await page.locator('button[aria-label^="View photo 1"]').click();
	await page.getByRole('dialog', { name: 'Photos' }).waitFor();
	await shot('6c-fullscreen');
	await page.click('button[aria-label="Close photos"]');
	await page.goBack();
	await page.waitForTimeout(800);
	if (await page.getByRole('dialog').count()) throw new Error('Back did not close the pop-up');
	step('pop-up shows both photos, full-screen viewer works, Back closes it');

	// A place search can't find: name it, drop a pin.
	await page.click('button:has-text("＋ Add spot")');
	await page.click('text=Can’t find it? Add it by hand');
	await page.fill('input[placeholder^="What"]', 'Ammi Darshini');
	await page.click('button:has-text("Drop a pin on the map")');
	await page.click('button:has-text("Pin it here")');
	await page.getByText('Nice pick').waitFor({ timeout: 15000 });
	await page.click('button:has-text("Add to my map")');
	await page.getByText(/Spot #\d+ added/).waitFor({ timeout: 15000 });
	step('dropped a pin for a place search could not find');

	// "I'm here right now": nearby food places, nearest first.
	await page.click('button:has-text("＋ Add spot")');
	await page.click('button:has-text("I’m here right now")');
	await page.getByText('Around you, nearest first').waitFor({ timeout: 15000 });
	await shot('8-around-me');
	const nearby = await page.locator('li button', { hasText: '＋' }).count();
	await page.locator('li button', { hasText: '＋' }).first().click();
	await page.click('button:has-text("Add to my map")');
	await page.getByText(/Spot #\d+ added/).waitFor({ timeout: 15000 });
	step(`"I'm here" listed ${nearby} places around me and added the nearest`);

	// Not listed: pin the exact spot I'm standing on.
	await page.click('button:has-text("＋ Add spot")');
	await page.click('button:has-text("I’m here right now")');
	await page.getByText('Not listed? Pin my exact location').waitFor({ timeout: 15000 });
	await page.click('text=Not listed? Pin my exact location');
	await page.fill('input[placeholder^="What"]', 'Ravi’s dosa cart');
	await page.click('button:has-text("Add it where I am now")');
	await page.getByText('Nice pick').waitFor({ timeout: 15000 });
	await page.click('button:has-text("Add to my map")');
	await page.getByText(/Spot #\d+ added/).waitFor({ timeout: 15000 });
	step('pinned an unlisted place at my exact location');

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
	await visitor.click('button[aria-label="Search this map"]');
	await visitor.fill('input[aria-label="Search this map"]', 'chocolate');
	await visitor.waitForTimeout(800);
	const hits = await visitor.locator('[data-id]').count();
	if (hits !== 1) throw new Error(`search "chocolate" should find 1 spot, found ${hits}`);
	step('visitor search finds a spot by words in its tip');
	step(`visitor view of /${handle}`);
} catch (e) {
	await shot('error');
	console.error('FAILED:', e.message);
	process.exitCode = 1;
} finally {
	console.log(errors.length ? `page errors:\n${errors.slice(0, 10).join('\n')}` : 'no page errors');
	await browser.close();
	// Photos live in storage under <uid>/<spot>/; deleting the user doesn't remove them.
	const { data: folders } = await admin.storage.from('photos').list(user.id);
	for (const f of folders ?? []) {
		const { data: files } = await admin.storage.from('photos').list(`${user.id}/${f.name}`);
		const paths = (files ?? []).map((x) => `${user.id}/${f.name}/${x.name}`);
		if (paths.length) await admin.storage.from('photos').remove(paths);
	}
	await admin.auth.admin.deleteUser(user.id);
}
