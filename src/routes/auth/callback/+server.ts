import { redirect } from '@sveltejs/kit';
import type { EmailOtpType } from '@supabase/supabase-js';
import type { RequestHandler } from './$types';

// The sign-in email's link lands here. token_hash works in any browser, including
// in-app browsers (Gmail, Instagram) that don't share cookies with the one that asked.
export const GET: RequestHandler = async ({ url, locals }) => {
	const tokenHash = url.searchParams.get('token_hash');
	const type = (url.searchParams.get('type') ?? 'email') as EmailOtpType;
	const code = url.searchParams.get('code');

	const { error } = tokenHash
		? await locals.supabase.auth.verifyOtp({ token_hash: tokenHash, type })
		: code
			? await locals.supabase.auth.exchangeCodeForSession(code)
			: { error: new Error('missing token') };

	redirect(303, error ? '/?signin=expired' : '/welcome');
};
