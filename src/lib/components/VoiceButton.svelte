<script lang="ts">
	import { onDestroy } from 'svelte';

	// 🎙️ Tap to talk, tap to stop: the recording becomes text (Whisper, via /api/transcribe)
	// that lands in the box, so it can be fixed before "Pin them".
	type Props = { ontext: (text: string) => void; onerror: (message: string) => void };
	let { ontext, onerror }: Props = $props();

	const MAX_SECONDS = 90;
	let phase: 'idle' | 'recording' | 'sending' = $state('idle');
	let seconds = $state(0);
	let recorder: MediaRecorder | null = null;
	let stream: MediaStream | null = null;
	let chunks: Blob[] = [];
	let timer: ReturnType<typeof setInterval> | undefined;
	let cancelled = false;

	// Chrome and Firefox record WebM; Safari only MP4.
	function mimeType() {
		for (const t of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']) {
			if (MediaRecorder.isTypeSupported(t)) return t;
		}
		return '';
	}

	async function start() {
		if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined')
			return onerror('Voice isn’t available in this browser. Type it instead');
		try {
			stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		} catch {
			return onerror('The microphone is off. Allow it in your browser, or type instead');
		}
		const type = mimeType();
		recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
		chunks = [];
		cancelled = false;
		recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
		recorder.onstop = send;
		recorder.start();
		phase = 'recording';
		seconds = 0;
		timer = setInterval(() => {
			seconds += 1;
			if (seconds >= MAX_SECONDS) stop();
		}, 1000);
	}

	function stop() {
		clearInterval(timer);
		if (recorder?.state === 'recording') recorder.stop();
		stream?.getTracks().forEach((t) => t.stop());
		stream = null;
	}

	async function send() {
		if (cancelled) return;
		if (seconds < 1) {
			phase = 'idle';
			return onerror('That was quick! Tap, say your spots, then tap again to stop');
		}
		phase = 'sending';
		const type = recorder?.mimeType || 'audio/webm';
		const form = new FormData();
		form.append(
			'audio',
			new Blob(chunks, { type }),
			type.includes('mp4') ? 'voice.mp4' : 'voice.webm'
		);
		try {
			const res = await fetch('/api/transcribe', { method: 'POST', body: form });
			const body = (await res.json().catch(() => ({}))) as { text?: string; message?: string };
			if (!res.ok) throw new Error(body.message ?? 'Couldn’t hear that. Try again');
			if (!body.text) throw new Error('We didn’t catch that. Try again, a bit closer');
			ontext(body.text);
		} catch (e) {
			onerror(e instanceof Error ? e.message : 'Couldn’t hear that. Try again');
		} finally {
			phase = 'idle';
		}
	}

	onDestroy(() => {
		cancelled = true;
		stop();
	});

	const clock = $derived(`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`);
</script>

<button
	type="button"
	disabled={phase === 'sending'}
	onclick={() => (phase === 'recording' ? stop() : start())}
	aria-label={phase === 'recording' ? 'Stop recording' : 'Say your spots'}
	class="flex flex-1 items-center justify-center gap-2 rounded-full border-2 border-ink bg-surface py-2 font-extrabold disabled:opacity-60"
	class:recording={phase === 'recording'}
>
	{#if phase === 'recording'}
		<span class="dot" aria-hidden="true"></span> Stop · {clock}
	{:else if phase === 'sending'}
		<span class="animate-spin" aria-hidden="true">◌</span> Listening…
	{:else}
		🎙️ Say it
	{/if}
</button>

<style>
	.recording {
		background: var(--ink);
		color: var(--surface);
	}
	.dot {
		width: 10px;
		height: 10px;
		border-radius: 999px;
		background: #ff4d4d;
		animation: pulse 1s ease-in-out infinite;
	}
	@keyframes pulse {
		50% {
			opacity: 0.3;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.dot {
			animation: none;
		}
	}
</style>
