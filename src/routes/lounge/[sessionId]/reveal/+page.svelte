<script lang="ts">
// src/routes/lounge/[sessionId]/reveal/+page.svelte
import GrandReveal from "$lib/components/GrandReveal.svelte";
import type { PageData } from "./$types";

let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>The Grand Reveal — The Director's Lounge</title>
</svelte:head>

<GrandReveal
	nominations={data.nominations}
	winnerNominationId={data.winnerNominationId}
/>
