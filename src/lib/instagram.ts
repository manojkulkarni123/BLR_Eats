/** Pull a username out of whatever people paste: "@name", "name", or an instagram.com link. */
export function parseInstagram(input: string): string | null {
	const raw = input.trim();
	if (!raw) return null;
	const fromUrl = raw.match(/instagram\.com\/([A-Za-z0-9._]+)/i)?.[1];
	const name = (fromUrl ?? raw).replace(/^@/, '').replace(/\/+$/, '');
	return /^[A-Za-z0-9._]{1,30}$/.test(name) ? name : null;
}

export function instagramUrl(username: string): string {
	return `https://www.instagram.com/${encodeURIComponent(username)}/`;
}
