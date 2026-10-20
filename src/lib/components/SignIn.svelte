<script lang="ts">
	import { goto } from '$app/navigation';
	import { supabase } from '#lib/supabase.ts';

	// Email → 6-digit code. The email also has a link, but the code works everywhere,
	// including in-app browsers that can't follow a sign-in link.
	const CODE_PATTERN = '[0-9]{6,8}';
	let step: 'email' | 'code' = $state('email');
	let email = $state('');
	let code = $state('');
	let busy = $state(false);
	let error: string | null = $state(null);

	async function sendCode(e: SubmitEvent) {
		e.preventDefault();
		busy = true;
		error = null;
		const { error: err } = await supabase().auth.signInWithOtp({
			email: email.trim(),
			options: { emailRedirectTo: `${location.origin}/auth/callback` }
		});
		busy = false;
		if (err) {
			error = err.status === 429 ? 'Too many tries. Wait a minute and try again' : err.message;
			return;
		}
		step = 'code';
	}

	async function verify(e: SubmitEvent) {
		e.preventDefault();
		busy = true;
		error = null;
		const { error: err } = await supabase().auth.verifyOtp({
			email: email.trim(),
			token: code.trim(),
			type: 'email'
		});
		if (err) {
			busy = false;
			error = 'That code didn’t work. Check it or send a new one';
			return;
		}
		await goto('/welcome', { refreshAll: true });
	}
</script>

{#if step === 'email'}
	<form onsubmit={sendCode} class="flex flex-col gap-3">
		<input
			type="email"
			required
			bind:value={email}
			placeholder="you@email.com"
			autocomplete="email"
			class="sticker rounded-2xl bg-surface px-4 py-3 text-lg font-semibold outline-none"
		/>
		<button
			disabled={busy}
			class="sticker rounded-full bg-sun py-3 text-xl font-extrabold disabled:opacity-60"
		>
			{busy ? 'Sending…' : 'Make my map →'}
		</button>
	</form>
{:else}
	<form onsubmit={verify} class="flex flex-col gap-3">
		<p class="font-semibold">
			Check <b>{email}</b>. Tap the sign-in link in the email, or type the code here.
		</p>
		<input
			required
			bind:value={code}
			inputmode="numeric"
			autocomplete="one-time-code"
			pattern={CODE_PATTERN}
			maxlength="8"
			placeholder="123456"
			class="sticker rounded-2xl bg-surface px-4 py-3 text-center text-3xl font-extrabold tracking-[0.3em] outline-none"
		/>
		<button
			disabled={busy}
			class="sticker rounded-full bg-sun py-3 text-xl font-extrabold disabled:opacity-60"
		>
			{busy ? 'Checking…' : 'Let me in →'}
		</button>
		<button
			type="button"
			class="text-sm font-semibold underline opacity-70"
			onclick={() => (step = 'email')}
		>
			Use a different email
		</button>
	</form>
{/if}

{#if error}
	<p class="mt-2 font-extrabold text-accent" role="alert">{error}</p>
{/if}
