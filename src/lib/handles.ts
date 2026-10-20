// Handles become the first URL segment, so they can't collide with app routes.
const RESERVED = new Set([
	'about',
	'admin',
	'api',
	'app',
	'auth',
	'demo',
	'help',
	'login',
	'logout',
	'map',
	'maps',
	'me',
	'new',
	'og',
	'privacy',
	'settings',
	'signin',
	'signout',
	'signup',
	'spot',
	'start',
	'support',
	'terms',
	'welcome',
	'blr',
	'blreats',
	'blr_eats'
]);

export const HANDLE_RULES = '3–20 characters: lowercase letters, numbers or _';

export function handleProblem(handle: string): string | null {
	if (!/^[a-z0-9_]{3,20}$/.test(handle)) return HANDLE_RULES;
	if (RESERVED.has(handle)) return 'That one is taken';
	return null;
}

export function suggestHandle(email: string): string {
	const base = email
		.split('@')[0]
		.toLowerCase()
		.replace(/[^a-z0-9_]/g, '')
		.slice(0, 20);
	return base.length >= 3 ? base : `${base}eats`.slice(0, 20);
}
