// "Turn your list into a map": sign up, paste a messy list (names, tips, a Google Maps
// link), check the matches, save, and confirm the spots and tips landed in the DB.
// Usage: node --env-file=.env scripts/e2e-paste-list.mjs <outDir>
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

// A real-world messy list: typos, chains with many branches, no areas, a Maps link for a
// place also named in text, and a line that isn't food.
const LIST = `my blr food list 🍽️🔥

1. CTR malleshwaram - benne masala dosa, go early or wait 40 mins
2. vidyarthi bhavan basavanagudi (masala dosa obv)
3) Meghana foods koramangala – boneless biryani!!
4. brahmins coffee bar, shankarpuram. idli vada + coffee, cash only
- Toit indiranagar for beers n pizza
- third wave coffee hsr
- Truffles st marks rd. all day breakfast + burgers
* MTR lalbagh rd - rava idli
* Airlines hotel - masala dosa under the tree
Corner House - death by chocolate 🍫
Rameshwaram cafe brookefield - ghee podi idli
Empire restaurant church st late night
https://www.google.com/maps/place/Vidyarthi+Bhavan/@12.9452,77.5713,17z/data=!3m1!4b1!4m6!3m5!1s0x3bae15!8m2!3d12.9451786!4d77.5712869!16s
also need to go to the dentist in jayanagar lol`;

const browser = await chromium.launch({
	channel: 'msedge',
	args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
const page = await (await browser.newContext({ ...devices['Pixel 7'] })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const shot = (n) => page.screenshot({ path: `${out}/paste-${n}.png` });
const step = (s) => console.log(`✓ ${s}`);

try {
	await page.goto(`${base}/auth/callback?token_hash=${link.properties.hashed_token}&type=email`);
	await page.waitForURL('**/welcome');
	await page.waitForLoadState('networkidle');
	await page.fill('input[name=name]', 'E2E Paster');
	await page.fill('input[name=handle]', handle);
	await page.click('button:has-text("Make my map")');
	await page.getByText('Tell us your spots').first().waitFor();
	step('signed up → top spots sheet');

	await page.click('[role=tab]:has-text("Tell us")');
	await page.fill('textarea', LIST);
	await shot('1-pasted');
	await page.click('button:has-text("Pin them")');
	await page.getByText('Reading what you wrote').waitFor();
	await shot('2-thinking');
	step('thinking state shown');
	await page
		.getByText(/Done, show my map|Couldn’t find/)
		.first()
		.waitFor({ timeout: 45000 });
	await page.waitForTimeout(300);
	await shot('3-review');
	const names = await page
		.locator('li.sticker')
		.evaluateAll((els) =>
			els.map(
				(e) =>
					e.querySelectorAll('p')[0]?.textContent.trim() +
					' · ' +
					e.querySelectorAll('p')[1]?.textContent.trim().split('·')[0].trim()
			)
		);
	const tips = await page
		.locator('input[aria-label^="Tip for"]')
		.evaluateAll((els) => els.map((e) => e.value));
	const missing = await page
		.locator('text=Couldn’t find')
		.locator('..')
		.locator('li span')
		.allTextContents();
	console.log(
		'  matched:',
		names.map((n) => n.trim())
	);
	console.log('  tips:', tips);
	console.log('  not found:', missing);
	if (!names.length) throw new Error('nothing matched');

	await page.click('button:has-text("Done, show my map")');
	await page.getByText(/Your map has \d+ spots/).waitFor({ timeout: 15000 });
	await shot('4-celebrate');
	step('saved → celebration');

	const { data: rows } = await admin
		.from('spots')
		.select('name, area, recommendation, category, osm_id')
		.eq('owner_id', user.id);
	console.log('  in DB:', rows);
	if (!rows?.some((r) => r.recommendation)) throw new Error('no tips saved');
	step('spots and tips saved');
} catch (e) {
	await shot('error');
	console.error('FAILED:', e.message);
	process.exitCode = 1;
} finally {
	console.log(errors.length ? `page errors:\n${errors.slice(0, 10).join('\n')}` : 'no page errors');
	await browser.close();
	await admin.auth.admin.deleteUser(user.id);
}
