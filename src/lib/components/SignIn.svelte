<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '#lib/supabase.ts';

	// Google sign-in only (DECISIONS.md). Google refuses sign-in inside in-app browsers
	// (Instagram, Facebook, other webviews), so there we offer to reopen the page in a real browser.
	let busy = $state(false);
	let error: string | null = $state(null);
	let inApp: 'android' | 'ios' | null = $state(null);
	let copied = $state(false);

	onMount(() => {
		const ua = navigator.userAgent;
		const webview =
			/Instagram|FBAN|FBAV|FB_IAB|FBIOS|Line\/|Snapchat|LinkedInApp|Twitter|; wv\)/i.test(ua);
		if (webview) inApp = /Android/i.test(ua) ? 'android' : 'ios';
	});

	async function google() {
		busy = true;
		error = null;
		const { error: err } = await supabase().auth.signInWithOAuth({
			provider: 'google',
			options: { redirectTo: `${location.origin}/auth/callback` }
		});
		if (err) {
			busy = false;
			error = 'Couldn’t reach Google. Try again';
		}
	}

	function openInBrowser() {
		const { host, pathname, search } = location;
		location.href =
			inApp === 'android'
				? `intent://${host}${pathname}${search}#Intent;scheme=https;package=com.android.chrome;end`
				: `x-safari-https://${host}${pathname}${search}`;
	}

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(location.href);
			copied = true;
		} catch {
			copied = false;
		}
	}
</script>

{#if inApp}
	<div class="sticker flex flex-col gap-3 rounded-3xl bg-surface p-4">
		<p class="font-extrabold">Google sign-in doesn't work inside this app's browser.</p>
		<button
			type="button"
			onclick={openInBrowser}
			class="sticker rounded-full bg-sun py-3 text-lg font-extrabold"
		>
			Open in {inApp === 'android' ? 'Chrome' : 'Safari'} →
		</button>
		<p class="text-sm font-semibold opacity-70">
			Didn't work? Tap <b>•••</b> at the top and choose <b>Open in browser</b>, or
			<button type="button" class="underline" onclick={copyLink}>
				{copied ? 'link copied ✓' : 'copy the link'}
			</button>.
		</p>
	</div>
{:else}
	<button
		type="button"
		disabled={busy}
		onclick={google}
		class="sticker flex items-center justify-center gap-3 rounded-full bg-surface py-3 text-xl font-extrabold disabled:opacity-60"
	>
		<svg viewBox="0 0 48 48" class="size-6" aria-hidden="true">
			<path
				fill="#FFC107"
				d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
			/>
			<path
				fill="#FF3D00"
				d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
			/>
			<path
				fill="#4CAF50"
				d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
			/>
			<path
				fill="#1976D2"
				d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
			/>
		</svg>
		{busy ? 'Opening Google…' : 'Continue with Google'}
	</button>
{/if}

{#if error}
	<p class="mt-2 font-extrabold text-accent" role="alert">{error}</p>
{/if}
