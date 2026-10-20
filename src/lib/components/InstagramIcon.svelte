<script lang="ts">
	let { class: className = 'size-5' }: { class?: string } = $props();
</script>

<!-- The camera glyph, drawn in currentColor so it takes the button's colours. -->
<svg viewBox="0 0 24 24" class={className} aria-hidden="true" fill="none" stroke="currentColor">
	<rect x="3" y="3" width="18" height="18" rx="5.5" stroke-width="2.4" />
	<circle cx="12" cy="12" r="4.2" stroke-width="2.4" />
	<circle cx="17.4" cy="6.6" r="1.4" fill="currentColor" stroke="none" />
</svg>
