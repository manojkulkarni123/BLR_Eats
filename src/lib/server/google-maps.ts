import { areaAt, localId, searchPlaces, suggest, type Place } from '#lib/places.ts';

// People keep their spots in Google Maps, so a pasted Maps link should become a pin.
// Share links (maps.app.goo.gl) redirect to a full URL that carries the name and coordinates.

export const MAPS_LINK =
	/https?:\/\/(?:maps\.app\.goo\.gl|goo\.gl\/maps|(?:www\.)?google\.[a-z.]+\/maps|maps\.google\.[a-z.]+)[^\s<>"')]*/gi;

// Inside Bangalore, with some room to spare (the DB checks the exact box).
const inBangalore = (lat: number, lng: number) =>
	lat > 12.7 && lat < 13.3 && lng > 77.3 && lng < 77.9;

async function expand(url: string): Promise<string> {
	let current = url;
	for (let i = 0; i < 5; i++) {
		const res = await fetch(current, {
			redirect: 'manual',
			headers: { 'User-Agent': 'Mozilla/5.0 (blr_eats link preview)' },
			signal: AbortSignal.timeout(6000)
		});
		const next = res.headers.get('location');
		if (!next || res.status < 300 || res.status >= 400) return current;
		current = new URL(next, current).href;
	}
	return current;
}

const decode = (s: string) => decodeURIComponent(s.replace(/\+/g, ' ')).trim();

/** A Bangalore place from a Google Maps link, or null when the link doesn't point at one. */
export async function placeFromMapsLink(link: string): Promise<Place | null> {
	let url: URL;
	let href: string;
	try {
		url = new URL(await expand(link));
		href = decodeURIComponent(url.href);
	} catch {
		return null;
	}

	const name = url.pathname.match(/\/place\/([^/]+)/)?.[1];
	// The pin itself (!3d…!4d…) is more exact than the camera position (@lat,lng).
	const pin =
		href.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) ?? href.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
	const q = url.searchParams.get('q') ?? url.searchParams.get('query');
	const qPoint = q?.match(/^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/);

	if (name && pin) {
		const lat = Number(pin[1]);
		const lng = Number(pin[2]);
		if (!inBangalore(lat, lng)) return null;
		// Google names often carry the address after a comma: "Kalpaney, 12th Main Rd, …".
		const title = decode(name).split(',')[0];
		return {
			name: title.trim(),
			lat,
			lng,
			area: await areaAt(lat, lng),
			street: '',
			osmId: localId(lat, lng),
			isFood: true,
			suggestedCategory: suggest('', title)
		};
	}
	// A search link ("?q=CTR Malleshwaram"): look the text up instead.
	const text = name ? decode(name) : q && !qPoint ? q : null;
	if (text) {
		const [first] = await searchPlaces(text);
		return first ?? null;
	}
	return null;
}
