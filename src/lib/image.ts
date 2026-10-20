// Photos are resized in the browser before upload: fast on mobile data and cheap to store.

export type ResizedPhoto = {
	full: Blob;
	thumb: Blob;
	width: number;
	height: number;
	ext: 'webp' | 'jpg';
};

async function encode(bitmap: ImageBitmap, maxSide: number, quality: number) {
	const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
	const width = Math.round(bitmap.width * scale);
	const height = Math.round(bitmap.height * scale);
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height);

	const toBlob = (type: string) =>
		new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
	// Some Safari versions can't encode WebP and silently return PNG; fall back to JPEG.
	let blob = await toBlob('image/webp');
	let ext: 'webp' | 'jpg' = 'webp';
	if (!blob || blob.type !== 'image/webp') {
		blob = await toBlob('image/jpeg');
		ext = 'jpg';
	}
	if (!blob) throw new Error('Could not read that photo');
	return { blob, width, height, ext };
}

export async function resizePhoto(file: File): Promise<ResizedPhoto> {
	const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
	try {
		const full = await encode(bitmap, 1600, 0.82);
		const thumb = await encode(bitmap, 480, 0.78);
		return {
			full: full.blob,
			thumb: thumb.blob,
			width: full.width,
			height: full.height,
			ext: full.ext
		};
	} finally {
		bitmap.close();
	}
}
