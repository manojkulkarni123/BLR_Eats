import { fail, redirect } from '@sveltejs/kit';
import { handleProblem, suggestHandle } from '#lib/handles.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { me } = await parent();
	if (!me) redirect(303, '/');
	if (me.handle) redirect(303, `/${me.handle}`);
	return { suggestion: suggestHandle(me.email) };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = await locals.getUser();
		if (!user) redirect(303, '/');

		const form = await request.formData();
		const handle = String(form.get('handle') ?? '').trim().toLowerCase();
		const displayName = String(form.get('name') ?? '').trim().slice(0, 40);

		const problem = handleProblem(handle);
		if (problem) return fail(400, { handle, displayName, error: problem });
		if (!displayName) return fail(400, { handle, displayName, error: 'Add your name' });

		const { error } = await locals.supabase
			.from('profiles')
			.insert({ id: user.id, handle, display_name: displayName });
		if (error) {
			const taken = error.code === '23505';
			return fail(400, {
				handle,
				displayName,
				error: taken ? 'That handle is taken. Try another' : 'Something went wrong. Try again'
			});
		}
		// New maps open straight into "Add your top spots".
		redirect(303, `/${handle}?add=top`);
	}
};
