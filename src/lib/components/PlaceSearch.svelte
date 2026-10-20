<script lang="ts">
	import { onMount } from 'svelte';
	import { searchPlaces, type Place } from '#lib/places.ts';

	type Props = { onpick: (place: Place) => void; placeholder?: string; autofocus?: boolean };
	let { onpick, placeholder = 'Search a place, e.g. CTR', autofocus = true }: Props = $props();

	let query = $state('');
	let results: Place[] = $state([]);
	let loading = $state(false);
	let searched = $state(false);
	let input: HTMLInputElement;
	let timer: ReturnType<typeof setTimeout>;
	let controller: AbortController | null = null;

	onMount(() => {
		if (autofocus) input.focus();
	});

	function onInput() {
		clearTimeout(timer);
		timer = setTimeout(run, 250);
	}

	async function run() {
		controller?.abort();
		controller = new AbortController();
		loading = true;
		try {
			results = await searchPlaces(query, controller.signal);
			searched = query.trim().length >= 2;
		} catch (e) {
			if (!(e instanceof DOMException && e.name === 'AbortError')) results = [];
		} finally {
			loading = false;
		}
	}

	function pick(place: Place) {
		onpick(place);
		query = '';
		results = [];
		searched = false;
		input.focus();
	}
</script>

<div class="flex flex-col gap-2">
	<div class="sticker flex items-center gap-2 rounded-2xl bg-surface px-4 py-3">
		<span aria-hidden="true">🔎</span>
		<input
			bind:this={input}
			bind:value={query}
			oninput={onInput}
			{placeholder}
			enterkeyhint="search"
			autocomplete="off"
			class="min-w-0 flex-1 bg-transparent text-lg font-semibold outline-none"
		/>
		{#if loading}<span class="animate-spin text-lg" aria-label="Searching">◌</span>{/if}
	</div>

	{#if results.length}
		<ul class="flex flex-col gap-1.5">
			{#each results as place (place.osmId)}
				<li>
					<button
						type="button"
						onclick={() => pick(place)}
						class="flex w-full items-center gap-3 rounded-2xl border-2 border-ink/15 bg-surface px-3 py-2 text-left active:bg-sun/40"
					>
						<span class="text-xl" aria-hidden="true">📍</span>
						<span class="min-w-0 flex-1">
							<span class="block truncate font-extrabold">{place.name}</span>
							<span class="block truncate text-sm font-semibold opacity-60"
								>{place.area || 'Bangalore'}</span
							>
						</span>
						<span class="font-extrabold">＋</span>
					</button>
				</li>
			{/each}
		</ul>
	{:else if searched && !loading}
		<p class="px-1 font-semibold opacity-70">
			No match in Bangalore. Try a shorter name or the area too.
		</p>
	{/if}
</div>
