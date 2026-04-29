<script lang="ts">
// src/routes/lounge/[sessionId]/+layout.svelte
import { sessionService } from "$lib/client/services/session.svelte";

let { children } = $props();

let isAuthReady = $state(false);

$effect(() => {
	sessionService.initialize().then(() => {
		isAuthReady = true;
	});
});
</script>

{#if !isAuthReady}
	<div
		class="flex min-h-screen items-center justify-center"
		style="background-color: var(--color-bg);"
	>
		<div class="text-center">
			<div class="mb-4 text-4xl" aria-hidden="true">🎬</div>
			<p class="text-sm opacity-40" style="color: var(--color-text);">Entering the lounge…</p>
		</div>
	</div>
{:else}
	{@render children()}
{/if}
