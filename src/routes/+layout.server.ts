import { askEnabled } from '#lib/server/ask.ts';
import type { LayoutServerLoad } from './$types';

// Who is signed in (if anyone), and their handle once they've picked one.
export const load: LayoutServerLoad = async ({ locals }) => {
	const user = await locals.getUser();
	if (!user) return { me: null, askEnabled };
	const { data } = await locals.supabase
		.from('profiles')
		.select('handle, display_name')
		.eq('id', user.id)
		.maybeSingle();
	return {
		me: {
			id: user.id,
			email: user.email ?? '',
			// Name from the Google account, used to prefill /welcome.
			accountName:
				((user.user_metadata?.full_name ?? user.user_metadata?.name) as string | undefined) ?? null,
			handle: (data?.handle as string | undefined) ?? null,
			displayName: (data?.display_name as string | undefined) ?? null
		},
		askEnabled
	};
};
