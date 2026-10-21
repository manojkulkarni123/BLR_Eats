import { AI_API_KEY, AI_BASE_URL, AI_FALLBACK_MODEL, AI_MODEL } from '$app/env/private';

// One place that talks to the AI provider (any OpenAI-compatible chat API; Groq's free
// tier by default). Used by "Ask this map" and "Turn your list into a map".

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
