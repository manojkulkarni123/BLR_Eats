import {
	AI_API_KEY,
	AI_BASE_URL,
	AI_FALLBACK_MODEL,
	AI_MODEL,
	AI_SPEECH_MODEL,
	AI_VISION_MODEL
} from '$app/env/private';

// One place that talks to the AI provider (any OpenAI-compatible chat API; Groq's free
// tier by default). Used by "Ask this map" and "Tell us your spots" (text, screenshots, voice).

export const aiEnabled = Boolean(AI_API_KEY);

async function complete(model: string, system: string, user: string, maxTokens: number) {
	return fetch(`${AI_BASE_URL}/chat/completions`, {
		method: 'POST',
		headers: { Authorization: `Bearer ${AI_API_KEY}`, 'Content-Type': 'application/json' },
		body: JSON.stringify({
			model,
			temperature: 0.3,
			max_tokens: maxTokens,
			// Reasoning models spend some tokens thinking before the JSON.
			...(model.includes('gpt-oss') ? { reasoning_effort: 'low' } : {}),
			response_format: { type: 'json_object' },
			messages: [
				{ role: 'system', content: system },
				{ role: 'user', content: user }
			]
		}),
		signal: AbortSignal.timeout(25000)
	});
}

/** Ask for a JSON object. Falls back to the smaller model when the main one is rate-limited. */
export async function aiJson<T>(system: string, user: string, maxTokens = 1000): Promise<T> {
	let res = await complete(AI_MODEL, system, user, maxTokens);
	if (res.status === 429) res = await complete(AI_FALLBACK_MODEL, system, user, maxTokens);
	if (!res.ok) throw new Error(`AI ${res.status}`);
	const body = (await res.json()) as { choices: { message: { content: string } }[] };
	return JSON.parse(body.choices[0]?.message?.content ?? '{}') as T;
}

/** Plain text out of images (screenshots), with an instruction. */
export async function aiReadImages(instruction: string, images: string[]): Promise<string> {
	const res = await fetch(`${AI_BASE_URL}/chat/completions`, {
		method: 'POST',
		headers: { Authorization: `Bearer ${AI_API_KEY}`, 'Content-Type': 'application/json' },
		body: JSON.stringify({
			model: AI_VISION_MODEL,
			temperature: 0.1,
			max_tokens: 1500,
			messages: [
				{
					role: 'user',
					content: [
						{ type: 'text', text: instruction },
						...images.map((url) => ({ type: 'image_url', image_url: { url } }))
					]
				}
			]
		}),
		signal: AbortSignal.timeout(30000)
	});
	if (!res.ok) throw new Error(`AI vision ${res.status}`);
	const body = (await res.json()) as { choices: { message: { content: string } }[] };
	return body.choices[0]?.message?.content ?? '';
}

/** Speech to text (Whisper). `hint` lists words it should expect, like place names. */
export async function aiTranscribe(audio: Blob, hint: string): Promise<string> {
	const form = new FormData();
	form.append('file', audio, audio.type.includes('mp4') ? 'voice.mp4' : 'voice.webm');
	form.append('model', AI_SPEECH_MODEL);
	form.append('language', 'en');
	form.append('prompt', hint);
	form.append('response_format', 'json');
	const res = await fetch(`${AI_BASE_URL}/audio/transcriptions`, {
		method: 'POST',
		headers: { Authorization: `Bearer ${AI_API_KEY}` },
		body: form,
		signal: AbortSignal.timeout(30000)
	});
	if (!res.ok) throw new Error(`AI speech ${res.status}`);
	return ((await res.json()) as { text?: string }).text?.trim() ?? '';
}
