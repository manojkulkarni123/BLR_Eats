<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { HANDLE_RULES } from '#lib/handles.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	// Start from the last attempt, or a suggestion from the email address.
	let handle = $state(untrack(() => form?.handle ?? data.suggestion));
	let busy = $state(false);
</script>

<svelte:head><title>Make your map · blr_eats</title></svelte:head>

<main class="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 px-6 py-12">
	<p class="text-5xl">🗺️</p>
	<h1 class="text-4xl leading-none font-extrabold">Let's make your map</h1>

	<form
		method="POST"
		class="flex flex-col gap-4"
		use:enhance={() => {
			busy = true;
			return async ({ update }) => {
				await update();
				busy = false;
			};
		}}
	>
		<label class="flex flex-col gap-1">
			<span class="font-extrabold">Your name</span>
			<input
				name="name"
				required
				maxlength="40"
				value={form?.displayName ?? ''}
				placeholder="Manoj"
				autocomplete="given-name"
				class="sticker rounded-2xl bg-surface px-4 py-3 text-lg font-semibold outline-none"
			/>
		</label>

		<label class="flex flex-col gap-1">
			<span class="font-extrabold">Your link</span>
			<div class="sticker flex items-center rounded-2xl bg-surface px-4 py-3 text-lg font-semibold">
				<span class="opacity-50">blr_eats/</span>
				<input
					name="handle"
					required
					bind:value={handle}
					oninput={() => (handle = handle.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
					maxlength="20"
					autocapitalize="none"
					autocomplete="off"
					spellcheck="false"
					class="min-w-0 flex-1 bg-transparent outline-none"
				/>
			</div>
			<span class="text-sm font-semibold opacity-60">{HANDLE_RULES}</span>
		</label>

		{#if form?.error}
			<p class="font-extrabold text-accent" role="alert">{form.error}</p>
		{/if}

		<button
			disabled={busy}
			class="sticker rounded-full bg-sun py-3 text-xl font-extrabold disabled:opacity-60"
		>
			{busy ? 'Making it…' : 'Make my map →'}
		</button>
	</form>
</main>
