<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head><title>Not found · blr_eats</title></svelte:head>

<main class="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6 py-12 text-center">
	<p class="text-6xl">🥲</p>
	<h1 class="text-4xl leading-none font-extrabold">
		{page.status === 404 ? (page.error?.message ?? 'Nothing here') : 'Something went wrong'}
	</h1>
	<p class="text-lg font-semibold opacity-75">
		{page.status === 404
			? 'The link might be old, or the spot was removed.'
			: 'Give it another try in a moment.'}
	</p>
	<a href="/" class="sticker mt-2 rounded-full bg-sun py-3 text-xl font-extrabold"
		>Go to blr_eats →</a
	>
</main>
