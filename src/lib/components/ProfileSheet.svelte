<script lang="ts">
	import { untrack } from 'svelte';
	import Sheet from './Sheet.svelte';
	import { parseInstagram } from '#lib/instagram.ts';
	import { updateProfile } from '#lib/spots-client.ts';
	import type { Profile } from '#lib/types.ts';

	type Props = { profile: Profile; onclose: () => void; ondone: () => Promise<void> };
	let { profile, onclose, ondone }: Props = $props();

	const initial = untrack(() => profile);
	let name = $state(initial.displayName);
	let instagram = $state(initial.instagram ? `@${initial.instagram}` : '');
	let busy = $state(false);
	let error: string | null = $state(null);

	async function save() {
		const username = parseInstagram(instagram);
		if (instagram.trim() && !username)
			return (error = 'That doesn’t look like an Instagram username');
		if (!name.trim()) return (error = 'Add your name');
		busy = true;
		error = null;
		try {
			await updateProfile(profile.id, { display_name: name.trim(), instagram: username });
			await ondone();
		} catch {
			error = 'Couldn’t save. Try again';
			busy = false;
		}
	}
</script>

<Sheet title="Your profile" {onclose}>
	<div class="flex flex-col gap-4">
		<label class="flex flex-col gap-1">
			<span class="font-extrabold">Your name</span>
			<input
				bind:value={name}
				maxlength="40"
				class="sticker rounded-2xl bg-surface px-4 py-2.5 text-lg font-semibold outline-none"
			/>
		</label>
		<label class="flex flex-col gap-1">
			<span class="font-extrabold"
				>Instagram <span class="font-semibold opacity-50">(optional)</span></span
			>
			<input
				bind:value={instagram}
				placeholder="@yourname or a link to your profile"
				autocapitalize="none"
				autocomplete="off"
				spellcheck="false"
				class="sticker rounded-2xl bg-surface px-4 py-2.5 text-lg font-semibold outline-none"
			/>
			<span class="text-sm font-semibold opacity-60">
				People viewing your map get a button to follow you.
			</span>
		</label>
	</div>

	{#snippet footer()}
		{#if error}<p class="mb-2 font-extrabold text-accent" role="alert">{error}</p>{/if}
		<button
			type="button"
			disabled={busy}
			onclick={save}
			class="sticker w-full rounded-full bg-sun py-3 text-xl font-extrabold disabled:opacity-60"
		>
			{busy ? 'Saving…' : 'Save'}
		</button>
	{/snippet}
</Sheet>
