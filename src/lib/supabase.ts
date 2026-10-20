import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_PUBLISHABLE_KEY, PUBLIC_SUPABASE_URL } from '$app/env/public';

let client: SupabaseClient | null = null;

/** The browser client, shared across the app. Writes are protected by RLS. */
export function supabase(): SupabaseClient {
	client ??= createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY);
	return client;
}

export function photoUrl(path: string): string {
	return `${PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${path}`;
}
