<script lang="ts">
	import { CONTACT_EMAIL } from '#lib/site.ts';
</script>

<svelte:head><title>Privacy · blr_eats</title></svelte:head>

<main class="mx-auto flex max-w-xl flex-col gap-4 px-6 py-12 text-lg font-semibold">
	<a href="/" class="font-extrabold underline">← blr_eats</a>
	<h1 class="text-4xl font-extrabold">Privacy, in plain words</h1>

	<h2 class="mt-2 text-2xl font-extrabold">What's public</h2>
	<p>
		Everything on your map is public to anyone with the link: your name, your handle, your spots,
		your notes and your photos. Map links aren't listed or searchable on blr_eats.
	</p>

	<h2 class="mt-2 text-2xl font-extrabold">What we keep private</h2>
	<p>
		Your email address. We use it only to sign you in. We don't send newsletters or sell anything.
	</p>

	<h2 class="mt-2 text-2xl font-extrabold">Location</h2>
	<p>
		"Near me" asks your phone for your location only when you tap it. It's used in your browser to
		find spots near you and is never sent to or stored by us.
	</p>

	<h2 class="mt-2 text-2xl font-extrabold">Who helps run it</h2>
	<p>
		Supabase stores accounts, maps and photos. Vercel hosts the site. Map data comes from
		OpenStreetMap contributors via OpenFreeMap.
	</p>

	<h2 class="mt-2 text-2xl font-extrabold">Deleting things, reporting things</h2>
	<p>
		Remove any spot from your map at any time. To delete your account, or to report a map or photo
		that shouldn't be here, email
		<a class="underline" href="mailto:{CONTACT_EMAIL}?subject=blr_eats">{CONTACT_EMAIL}</a>.
	</p>
</main>
