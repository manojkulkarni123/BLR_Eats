// Real app screenshots for the landing page, phone-sized (390×844 at 2×), saved to
// static/landing/. Re-run after UI changes so the landing page never shows an old app.
// Usage: node --env-file=.env scripts/landing-shots.mjs   (BASE_URL defaults to production)
import { chromium } from 'playwright-core';
import { createClient } from '@supabase/supabase-js';
import { mkdirSync } from 'node:fs';

const base = process.env.BASE_URL ?? 'https://blr-eats.vercel.app';
const out = 'static/landing';
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
	channel: 'msedge',
	args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
const phone = {
	viewport: { width: 390, height: 844 },
	deviceScaleFactor: 2,
	isMobile: true,
	hasTouch: true,
	userAgent:
		'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36'
};
// Wait for the pins, then a little longer for tiles, so a slow server never yields a blank map.
const settle = async (page, ms) => {
	await page.locator('.pin').first().waitFor({ timeout: 60000 });
	await page.waitForTimeout(ms);
};
const save = (page, name) =>
	page.screenshot({ path: `${out}/${name}.jpg`, type: 'jpeg', quality: 82 });

// 1–3: what a visitor sees.
{
	const page = await (await browser.newContext(phone)).newPage();
	await page.goto(`${base}/demo`);
	await settle(page, 5000);
	await save(page, 'map');
	console.log('✓ map');

	await page.goto(`${base}/demo/spot/vidyarthi-bhavan-basavanagudi`);
	await settle(page, 5000);
	await save(page, 'spot');
	console.log('✓ spot');

	await page.goto(`${base}/demo`);
	await settle(page, 3500);
	await page.click('button.chip.ask');
	await page.fill('input[aria-label="Ask this map"]', 'somewhere sweet after dinner?');
	await page.click('form button[type=submit]:has-text("Ask")');
	await page.locator('.answer').waitFor({ timeout: 30000 });
	await page.waitForTimeout(1200);
	await save(page, 'ask');
	console.log('✓ ask');
}

// 4–5: what an owner sees, with a throwaway account.
const admin = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
	auth: { persistSession: false }
});
const email = `shots-${Date.now()}@example.com`;
const user = (await admin.auth.admin.createUser({ email, email_confirm: true })).data.user;
const link = (await admin.auth.admin.generateLink({ type: 'magiclink', email })).data;
try {
	const page = await (await browser.newContext(phone)).newPage();
	await page.goto(`${base}/auth/callback?token_hash=${link.properties.hashed_token}&type=email`);
	await page.waitForURL('**/welcome');
	await page.waitForLoadState('networkidle');
	await page.fill('input[name=name]', 'Ananya');
	await page.fill('input[name=handle]', `shots${String(Date.now()).slice(-6)}`);
	await page.click('button:has-text("Make my map")');
	await page.getByText('Tell us your spots').first().waitFor();
	await page.fill(
		'textarea',
		'CTR in Malleshwaram for benne dosa, go early!\nMeghana Koramangala – boneless biryani\nBurma Burma Indiranagar, the khow suey\ncorner house death by chocolate 🍫'
	);
	await page.waitForTimeout(600);
	await save(page, 'tell');
	console.log('✓ tell');

	await page.click('button:has-text("Pin them")');
	await page.getByText(/Done, show my map/).waitFor({ timeout: 60000 });
	await page.waitForTimeout(800);
	await save(page, 'review');
	console.log('✓ review');
} finally {
	await admin.auth.admin.deleteUser(user.id);
	await browser.close();
}
