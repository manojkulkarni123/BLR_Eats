<script lang="ts">
	import { untrack } from 'svelte';
	import Sheet from './Sheet.svelte';
	import { parseInstagram } from '#lib/instagram.ts';
	import { updateProfile, uploadAvatar } from '#lib/spots-client.ts';
	import type { Profile } from '#lib/types.ts';
	import FoodIcon from './FoodIcon.svelte';
	import { LOOKS } from '#lib/look.ts';
	import { getTheme } from '#lib/theme.ts';

	type Props = { profile: Profile; onclose: () => void; ondone: () => Promise<void> };
	let { profile, onclose, ondone }: Props = $props();

	const MAX_BIO = 120;
	const initial = untrack(() => profile);
	let name = $state(initial.displayName);
	let bio = $state(initial.bio ?? '');
	let instagram = $state(initial.instagram ? `@${initial.instagram}` : '');
	let themeId = $state(initial.theme);
	let photo: File | null = $state(null);
	let preview: string | null = $state(initial.avatarUrl);
	let busy = $state(false);
	let error: string | null = $state(null);

	function onPhoto(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		photo = file;
		preview = URL.createObjectURL(file);
	}

	async function save() {
		const username = parseInstagram(instagram);
		if (instagram.trim() && !username)
			return (error = 'That doesn’t look like an Instagram username');
		if (!name.trim()) return (error = 'Add your name');
		busy = true;
		error = null;
		try {
			const avatar_path = photo
				? await uploadAvatar(profile.id, photo, profile.avatarPath)
				: profile.avatarPath;
			await updateProfile(profile.id, {
				display_name: name.trim(),
				bio: bio.trim() || null,
				instagram: username,
				avatar_path,
				theme: themeId
			});
			await ondone();
		} catch {
			error = 'Couldn’t save. Try again';
			busy = false;
		}
	}
</script>

<Sheet title="Your profile" {onclose}>
	<div class="flex flex-col gap-4">
		<label class="flex cursor-pointer items-center gap-4">
			{#if preview}
				<img src={preview} alt="" class="sticker size-20 rounded-full object-cover" />
			{:else}
				<span
					class="sticker grid size-20 place-items-center rounded-full bg-accent text-3xl font-extrabold text-surface"
				>
					{name.slice(0, 1).toUpperCase() || '?'}
				</span>
			{/if}
			<span class="font-extrabold underline">{preview ? 'Change photo' : 'Add a photo'}</span>
			<input type="file" accept="image/*" class="sr-only" onchange={onPhoto} />
		</label>

		<div class="flex flex-col gap-1.5">
			<span class="font-extrabold">Your map’s look</span>
			<div class="grid grid-cols-2 gap-2">
				{#each LOOKS as l (l.id)}
					{@const t = getTheme(l.id)}
					<button
						type="button"
						onclick={() => (themeId = l.id)}
						aria-pressed={themeId === l.id}
						class="look-tile flex flex-col gap-1 rounded-2xl border-2 p-2 text-left"
						class:picked={themeId === l.id}
						style="background:{t.map.land};border-color:{t.ui.ink};color:{t.ui.ink}"
					>
						<span class="flex items-center gap-1">
							{#if l.look === 'poster'}
								{#each ['south-indian', 'biryani', 'cafes'] as const as k (k)}
									<span
										class="grid size-9 place-items-center rounded-full border-2"
										style="background:{t.ui.surface};border-color:{t.ui.ink};box-shadow:2px 2px 0 {t
											.categories[k].bg}"
									>
										<FoodIcon
											kind={k}
											colors={{
												spot: t.categories[k].bg,
												ink: t.ui.ink,
												paper: t.ui.surface,
												cream: '#F4D9A0'
											}}
											size={26}
											offset={1.4}
										/>
									</span>
								{/each}
							{:else}
								{#each [['🥞', 'south-indian'], ['🍛', 'biryani'], ['☕', 'cafes']] as const as [e, k] (k)}
									<span
										class="grid size-9 place-items-center rounded-full border-2 text-lg"
										style="background:{t.categories[k].bg};border-color:{t.ui.ink}">{e}</span
									>
								{/each}
							{/if}
						</span>
						<span
							class="text-[15px] leading-tight font-extrabold"
							style={l.look === 'poster' ? "font-family:'Fraunces Variable',Georgia,serif" : ''}
							>{l.name}</span
						>
						<span class="text-xs leading-snug font-semibold opacity-70">{l.blurb}</span>
					</button>
				{/each}
			</div>
		</div>

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
				>Bio <span class="font-semibold opacity-50">(optional)</span></span
			>
			<input
				bind:value={bio}
				maxlength={MAX_BIO}
				placeholder="Dosa first, questions later."
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

<style>
	.look-tile {
		opacity: 0.75;
	}
	.look-tile.picked {
		opacity: 1;
		box-shadow: 3px 3px 0 var(--accent);
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
</style>
