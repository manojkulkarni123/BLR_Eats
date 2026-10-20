export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed';

/** Share through the phone's share menu, or copy the link where that isn't available. */
export async function shareLink(data: { title: string; text: string; url: string }): Promise<ShareResult> {
	if (navigator.share) {
		try {
			await navigator.share(data);
			return 'shared';
		} catch (e) {
			if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
		}
	}
	try {
		await navigator.clipboard.writeText(data.url);
		return 'copied';
	} catch {
		return 'failed';
	}
}

export function directionsUrl(lat: number, lng: number): string {
	return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
