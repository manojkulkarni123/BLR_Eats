import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	PUBLIC_SUPABASE_URL: { public: true, static: true, description: 'Supabase project URL' },
	PUBLIC_SUPABASE_PUBLISHABLE_KEY: {
		public: true,
		static: true,
		description: 'Supabase publishable key (safe in the browser; RLS protects writes)'
	},
	SUPABASE_SECRET_KEY: { description: 'Supabase secret key, server only' }
});
