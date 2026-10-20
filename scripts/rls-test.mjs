// End-to-end check of the security rules against the real project.
// Creates two throwaway users, then tries legal and illegal writes. Cleans up after.
// Usage: node --env-file=.env scripts/rls-test.mjs
import { createClient } from '@supabase/supabase-js';

const url = process.env.PUBLIC_SUPABASE_URL;
const admin = createClient(url, process.env.SUPABASE_SECRET_KEY, {
	auth: { persistSession: false }
});
const anonKey = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const results = [];
const check = (name, ok) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}`);

async function signedIn(email) {
	const created = await admin.auth.admin.createUser({ email, email_confirm: true });
	if (created.error) throw created.error;
	const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
	if (error) throw error;
	const client = createClient(url, anonKey, { auth: { persistSession: false } });
	const { data: s, error: e2 } = await client.auth.verifyOtp({
		token_hash: data.properties.hashed_token,
		type: 'email'
	});
	if (e2) throw e2;
	return { client, id: s.user.id };
}

const stamp = Date.now();
const a = await signedIn(`rls-a-${stamp}@example.com`);
const b = await signedIn(`rls-b-${stamp}@example.com`);
try {
	check(
		'A creates own profile',
		!(
			await a.client
				.from('profiles')
				.insert({ id: a.id, handle: `rlsa${stamp % 1e6}`, display_name: 'A' })
		).error
	);
	check(
		'B creates own profile',
		!(
			await b.client
				.from('profiles')
				.insert({ id: b.id, handle: `rlsb${stamp % 1e6}`, display_name: 'B' })
		).error
	);
	check(
		'A cannot create a profile for B',
		!!(await a.client.from('profiles').insert({ id: b.id, handle: 'nope_x', display_name: 'x' }))
			.error
	);

	const spot = {
		owner_id: a.id,
		slug: 'ctr',
		name: 'CTR',
		lat: 12.998,
		lng: 77.569,
		area: 'Malleswaram',
		category: 'south-indian'
	};
	const ins = await a.client.from('spots').insert(spot).select('id').single();
	check('A adds a spot', !ins.error);
	const spotId = ins.data?.id;

	check(
		'B cannot add a spot owned by A',
		!!(await b.client.from('spots').insert({ ...spot, slug: 'x' })).error
	);
	const upd = await b.client.from('spots').update({ name: 'hacked' }).eq('id', spotId).select();
	check("B cannot edit A's spot", !upd.error && upd.data.length === 0);
	const del = await b.client.from('spots').delete().eq('id', spotId).select();
	check("B cannot delete A's spot", !del.error && del.data.length === 0);

	const photo = {
		spot_id: spotId,
		owner_id: b.id,
		path: `${b.id}/x.webp`,
		thumb_path: `${b.id}/x-t.webp`,
		width: 1,
		height: 1
	};
	check(
		"B cannot attach a photo to A's spot",
		!!(await b.client.from('spot_photos').insert(photo)).error
	);

	const cat = await b.client
		.from('custom_categories')
		.insert({ owner_id: b.id, name: 'B cat', slug: 'b-cat' })
		.select('id')
		.single();
	const steal = await a.client
		.from('spots')
		.update({ custom_category_id: cat.data.id })
		.eq('id', spotId);
	check("A cannot use B's custom category", !!steal.error);

	const blob = new Blob([new Uint8Array([0])], { type: 'image/webp' });
	check(
		'A uploads into own photo folder',
		!(await a.client.storage.from('photos').upload(`${a.id}/t.webp`, blob)).error
	);
	check(
		"A cannot upload into B's folder",
		!!(await a.client.storage.from('photos').upload(`${b.id}/t.webp`, blob)).error
	);

	check(
		'Bangalore-only: a spot in Mumbai is rejected',
		!!(await a.client.from('spots').insert({ ...spot, slug: 'mum', lat: 19.07, lng: 72.87 })).error
	);

	const anon = createClient(url, anonKey);
	const pub = await anon.from('spots').select('id, name').eq('id', spotId);
	check(
		'Anyone can read a public spot',
		!pub.error && pub.data.length === 1 && pub.data[0].name === 'CTR'
	);
	check('Anyone cannot write', !!(await anon.from('spots').insert(spot)).error);
} finally {
	await admin.storage.from('photos').remove([`${a.id}/t.webp`]);
	await admin.auth.admin.deleteUser(a.id);
	await admin.auth.admin.deleteUser(b.id);
}
console.log(results.join('\n'));
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
