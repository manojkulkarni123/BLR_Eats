import { defineEnvVars } from '@sveltejs/kit/env';

const optional = (value: string | undefined) => value || undefined;

export const variables = defineEnvVars({
	PUBLIC_SUPABASE_URL: { public: true, static: true, description: 'Supabase project URL' },
	PUBLIC_SUPABASE_PUBLISHABLE_KEY: {
		public: true,
		static: true,
		description: 'Supabase publishable key (safe in the browser; RLS protects writes)'
	},
	// "Ask this map". Any OpenAI-compatible chat API works; Groq's free tier by default.
	AI_API_KEY: {
		schema: optional,
		description: 'Key for the AI provider; Ask is hidden without it'
	},
	AI_BASE_URL: {
		schema: (v) => v || 'https://api.groq.com/openai/v1',
		description: 'OpenAI-compatible base URL'
	},
	AI_MODEL: {
		schema: (v) => v || 'openai/gpt-oss-120b',
		description: 'Main model for Ask'
	},
	AI_FALLBACK_MODEL: {
		schema: (v) => v || 'openai/gpt-oss-20b',
		description: 'Used when the main model is rate-limited'
	},
	AI_VISION_MODEL: {
		schema: (v) => v || 'qwen/qwen3.8-27b',
		description: 'Reads place names off screenshots in "Tell us your spots"'
	},
	AI_SPEECH_MODEL: {
		schema: (v) => v || 'whisper-large-v3-turbo',
		description: 'Speech to text for the 🎙️ button in "Tell us your spots"'
	}
});
