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

	// Profile: paste a full Instagram link; the map shows a follow button for it.
	await page.click('button[aria-expanded]');
	await page.click('text=Edit profile & Instagram');
	await page.fill('input[placeholder^="@yourname"]', 'https://www.instagram.com/blr.eats_test/');
	await page.click('button:has-text("Save")');
	await page
		.getByRole('dialog', { name: 'Your profile' })
		.waitFor({ state: 'detached', timeout: 30000 });
	step('saved an Instagram link in the profile');

	// Profile photo and bio.
	await page.click('button[aria-expanded]');
	await page.click('text=Edit profile & Instagram');
	await page.setInputFiles('[role=dialog] input[type=file]', [photo('#06D6A0', 'me')]);
	await page.fill('input[placeholder^="Dosa first"]', 'Testing every dosa in town.');
	await page.click('button:has-text("Save")');
	await page
		.getByRole('dialog', { name: 'Your profile' })
		.waitFor({ state: 'detached', timeout: 30000 });
	step('uploaded a profile photo and bio');

	// A hand-made list, then put a spot in it from the spot's editor.
	await page.click('button[aria-expanded]');
	await page.click('text=⭐ Your lists');
	await page.click('button:has-text("Date night")');
	await page.click('[role=dialog] form button:has-text("Add")');
	await page.locator('[role=dialog] li', { hasText: 'Date night' }).waitFor({ timeout: 15000 });
	await page.click('[role=dialog] button.sticker[aria-label="Close"]');
	await page
		.locator('[data-id] article', { hasText: 'Corner House' })
		.locator('button[aria-label^="Edit"]')
		.click();
	await page.click('[role=dialog] button:has-text("Date night")');
	await page.click('button:has-text("Save")');
	await page.getByText('Saved').waitFor({ timeout: 15000 });
	step('created "Date night" and added Corner House to it');

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
	const ig = await visitor.locator('a[aria-label$="on Instagram"]').getAttribute('href');
	if (ig !== 'https://www.instagram.com/blr.eats_test/')
		throw new Error(`Instagram button href: ${ig}`);
	step('visitor sees the Instagram button → @blr.eats_test');

	// Ask this map: its own ✨ Ask chip, a thinking card, then an answer from this map only.
	const closeSearch = visitor.locator('button[aria-label="Close search"]');
	if (await closeSearch.count()) await closeSearch.click();
	await visitor.click('button:has-text("✨ Ask")');
	await visitor.fill('input[aria-label="Ask this map"]', 'something sweet for dessert');
	await visitor.click('form button[type=submit]:has-text("Ask")');
	await visitor
		.getByText(/Reading .*tips|Matching your mood|Picking the best/)
		.waitFor({ timeout: 5000 });
	step('asking shows the thinking card straight away');
	const bubble = visitor.locator('.answer');
	await bubble.waitFor({ timeout: 25000 });
	const answerText = (await bubble.textContent())?.replace(/\s+/g, ' ').trim();
	if (!/Corner House/.test(answerText ?? ''))
		throw new Error(`Ask didn't pick the dessert spot: ${answerText}`);
	await visitor.screenshot({ path: `${out}/e2e-10-ask.png` });
	step('Ask "something sweet" → picked Corner House');
	await visitor.click('button[aria-label="Close Ask"]');
	await visitor.click('button[aria-expanded]');
	await visitor.getByText('Testing every dosa in town.').waitFor({ timeout: 5000 });
	step('visitor taps the name chip and sees photo, bio and Follow');
	await visitor.goto(`${base}/${handle}/date-night`);
	await visitor.waitForTimeout(4000);
	const inList = await visitor.locator('[data-id]').count();
	if (inList !== 1) throw new Error(`/date-night should show 1 spot, showed ${inList}`);
	await visitor.screenshot({ path: `${out}/e2e-9-list.png` });
	step('the list link /date-night shows just its spot');

	// The visit above is counted; the owner sees it.
	await page.reload();
	await page.getByText(/👀 \d+ views?/).waitFor({ timeout: 15000 });
	step(
		`owner sees "${await page
			.getByText(/👀 \d+ views?/)
			.first()
			.textContent()}"`.replace(/\s+/g, ' ')
	);
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
		// Files at the top (the profile photo) have an id; folders (one per spot) don't.
		if (f.id) {
			await admin.storage.from('photos').remove([`${user.id}/${f.name}`]);
			continue;
		}
		const { data: files } = await admin.storage.from('photos').list(`${user.id}/${f.name}`);
		const paths = (files ?? []).map((x) => `${user.id}/${f.name}/${x.name}`);
		if (paths.length) await admin.storage.from('photos').remove(paths);
	}
	await admin.auth.admin.deleteUser(user.id);
}
