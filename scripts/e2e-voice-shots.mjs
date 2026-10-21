// "Tell us your spots" with a screenshot and a voice note: an Instagram-story-style image
// is uploaded, a spoken list goes through a fake microphone, then everything is pinned.
// Usage: node --env-file=.env scripts/e2e-voice-shots.mjs <outDir> <voice.wav>
// (Make the WAV with any text-to-speech tool: 16-bit mono, the list read out loud.)
import { chromium, devices } from 'playwright-core';
import { createClient } from '@supabase/supabase-js';
import { Resvg } from '@resvg/resvg-js';

const out = process.argv[2] ?? '.';
const wav = process.argv[3];
const base = process.env.BASE_URL ?? 'http://localhost:5173';
const admin = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
	auth: { persistSession: false }
});
const email = `e2e-${Date.now()}@example.com`;
const handle = `e2e${String(Date.now()).slice(-6)}`;
const user = (await admin.auth.admin.createUser({ email, email_confirm: true })).data.user;
const link = (await admin.auth.admin.generateLink({ type: 'magiclink', email })).data;

// A story-style screenshot: big title, place names with areas and a dish each.
const story = new Resvg(
	`<svg xmlns='http://www.w3.org/2000/svg' width='1080' height='1920'>
		<defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#3a1c71'/><stop offset='1' stop-color='#d76d77'/></linearGradient></defs>
		<rect width='1080' height='1920' fill='url(#g)'/>
		<text x='80' y='300' font-size='92' font-family='Arial' font-weight='bold' fill='#fff'>Cafe hopping in</text>
		<text x='80' y='410' font-size='92' font-family='Arial' font-weight='bold' fill='#ffd60a'>BLR ☕</text>
		<text x='80' y='640' font-size='58' font-family='Arial' fill='#fff'>1. Third Wave Coffee, HSR</text>
		<text x='120' y='710' font-size='42' font-family='Arial' fill='#ffe'>cold brew tonic</text>
		<text x='80' y='880' font-size='58' font-family='Arial' fill='#fff'>2. Glen's Bakehouse</text>
		<text x='120' y='950' font-size='42' font-family='Arial' fill='#ffe'>Indiranagar · red velvet</text>
		<text x='80' y='1120' font-size='58' font-family='Arial' fill='#fff'>3. Koshy's, St Marks Rd</text>
		<text x='120' y='1190' font-size='42' font-family='Arial' fill='#ffe'>fish and chips</text>
		<text x='80' y='1780' font-size='40' font-family='Arial' fill='#fff' opacity='0.8'>@somefoodie · save for later</text>
	</svg>`
)
	.render()
	.asPng();

const browser = await chromium.launch({
	channel: 'msedge',
	args: [
		'--use-angle=swiftshader',
		'--enable-unsafe-swiftshader',
		'--use-fake-ui-for-media-stream',
		'--use-fake-device-for-media-stream',
		...(wav ? [`--use-file-for-fake-audio-capture=${wav}`] : [])
	]
});
const context = await browser.newContext({ ...devices['Pixel 7'], permissions: ['microphone'] });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const shot = (n) => page.screenshot({ path: `${out}/voice-${n}.png` });
const step = (s) => console.log(`✓ ${s}`);

try {
	await page.goto(`${base}/auth/callback?token_hash=${link.properties.hashed_token}&type=email`);
	await page.waitForURL('**/welcome');
	await page.waitForLoadState('networkidle');
	await page.fill('input[name=name]', 'E2E Voice');
	await page.fill('input[name=handle]', handle);
	await page.click('button:has-text("Make my map")');
	await page.getByText('Tell us your spots').first().waitFor();
	step('signed up → Tell us your spots');

	await page.setInputFiles('input[type=file][multiple]', {
		name: 'story.png',
		mimeType: 'image/png',
		buffer: story
	});
	await page.locator('img[alt="Screenshot 1"]').waitFor();
	step('screenshot added');

	if (wav) {
		await page.click('button:has-text("Say it")');
		await page.getByText(/Stop · /).waitFor();
		await page.waitForTimeout(13000);
		await shot('1-recording');
		await page.click('button:has-text("Stop")');
		await page.waitForFunction(
			() => (document.querySelector('textarea')?.value ?? '').length > 10,
			undefined,
			{ timeout: 30000 }
		);
		console.log('  heard:', await page.inputValue('textarea'));
		step('voice note → text in the box');
	}
	await shot('2-ready');

	await page.click('button:has-text("Pin them")');
	await page.getByText('Reading your screenshots').waitFor();
	step('thinking: reading your screenshots');
	await page
		.getByText(/Done, show my map|Couldn’t find/)
		.first()
		.waitFor({ timeout: 60000 });
	await page.waitForTimeout(300);
	await shot('3-review');
	const rows = await page
		.locator('li.sticker')
		.evaluateAll((els) =>
			els.map(
				(e) =>
					`${e.querySelectorAll('p')[0]?.textContent.trim()} · ${e.querySelectorAll('p')[1]?.textContent.trim()} · tip: ${e.querySelector('input')?.value ?? ''}`
			)
		);
	console.log('  matched:\n   ', rows.join('\n    '));
	if (!rows.length) throw new Error('nothing matched');
	step(`${rows.length} places ready to pin`);
} catch (e) {
	await shot('error');
	console.error('FAILED:', e.message);
	process.exitCode = 1;
} finally {
	console.log(errors.length ? `page errors:\n${errors.slice(0, 10).join('\n')}` : 'no page errors');
	await browser.close();
	await admin.auth.admin.deleteUser(user.id);
}
