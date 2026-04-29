<!-- src/lib/components/Snackbar.svelte -->
<script lang="ts">
// src/lib/components/Snackbar.svelte

import { fly } from "svelte/transition";
import { snackbarService } from "$lib/client/services/snackbar.svelte";

const icons: Record<string, string> = {
	info: "ℹ️",
	success: "✅",
	error: "❌",
	loading: "⏳",
};

const bgColors: Record<string, string> = {
	info: "rgba(59, 130, 246, 0.9)",
	success: "rgba(34, 197, 94, 0.9)",
	error: "rgba(239, 68, 68, 0.9)",
	loading: "rgba(107, 114, 128, 0.9)",
};
</script>

{#if snackbarService.messages.length > 0}
	<div class="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
		{#each snackbarService.messages as msg (msg.id)}
			<div
				class="flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white text-sm"
				style="background: {bgColors[msg.type]}; backdrop-filter: blur(8px);"
				transition:fly={{ x: 300, duration: 300 }}
			>
				<span class="flex-shrink-0">{icons[msg.type]}</span>
				<span class="flex-1">{msg.message}</span>
				<button
					type="button"
					onclick={() => snackbarService.remove(msg.id)}
					class="flex-shrink-0 opacity-60 hover:opacity-100"
				>
					✕
				</button>
			</div>
		{/each}
	</div>
{/if}
