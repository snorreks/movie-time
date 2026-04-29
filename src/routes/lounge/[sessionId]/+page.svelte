<script lang="ts">
// src/routes/lounge/[sessionId]/+page.svelte
import { page } from "$app/stores";
import { sessionService } from "$lib/client/services/session.svelte";
import NominationCard from "$lib/components/NominationCard.svelte";
import { selectionLoungeViewModel } from "$lib/viewmodels/selection-lounge.viewmodel.svelte";

const sessionId = $derived($page.params.sessionId ?? "");

$effect(() => {
	selectionLoungeViewModel.initialize({ sessionId });
});
</script>

<svelte:head>
	<title>The Director's Lounge — {sessionId}</title>
</svelte:head>

<div class="min-h-screen px-4 py-8" style="background-color: var(--color-bg);">
	<div class="mx-auto max-w-6xl">
		
		<!-- Header -->
		<header class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<h1
					class="text-2xl sm:text-3xl font-bold"
					style="font-family: var(--font-display); color: var(--color-primary);"
				>
					The Director's Lounge
				</h1>
				<p class="mt-1 text-xs opacity-40" style="color: var(--color-text);">
					Session: <span class="font-mono text-xs sm:text-sm">{sessionId}</span>
					{#if selectionLoungeViewModel.session?.name}
						- {selectionLoungeViewModel.session.name}
					{/if}
				</p>
			</div>

			<!-- Pizza Toggle + Counter -->
			<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-4">
				{#if selectionLoungeViewModel.sessionUser}
					<button
						type="button"
						onclick={selectionLoungeViewModel.togglePizza}
						class="flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all"
						style={selectionLoungeViewModel.sessionUser.wantsPizza
							? 'background: rgba(212,175,55,0.15); border-color: var(--color-primary); color: var(--color-primary);'
							: 'border-color: var(--color-border); color: var(--color-text); opacity: 0.6;'}
					>
						🍕 {selectionLoungeViewModel.sessionUser.wantsPizza ? 'Pizza: Yes!' : 'Pizza?'}
					</button>
				{/if}

				<!-- Pizza Down Count -->
				{#if selectionLoungeViewModel.pizzaUsers.length > 0}
					<div class="flex items-center gap-2 rounded-full border px-4 py-2 text-sm"
						style="border-color: var(--color-border); color: var(--color-text);">
						🍕 Down: {selectionLoungeViewModel.pizzaUsers.length}
						<div class="flex -space-x-2">
							{#each selectionLoungeViewModel.pizzaUsers.slice(0, 5) as user}
								<div class="h-6 w-6 rounded-full bg-primary text-xs flex items-center justify-center text-white" title={user.displayName}>
									{user.displayName?.[0]?.toUpperCase() || '?'}
								</div>
							{/each}
							{#if selectionLoungeViewModel.pizzaUsers.length > 5}
								<div class="h-6 w-6 rounded-full bg-gray-600 text-xs flex items-center justify-center text-white" title="More users">
									+{selectionLoungeViewModel.pizzaUsers.length - 5}
								</div>
							{/if}
						</div>
					</div>
				{/if}

				<!-- Golden Tickets -->
				<div
					class="glass rounded-full px-4 py-2 text-sm font-semibold"
					style="color: var(--color-primary);"
				>
					🎟 {selectionLoungeViewModel.sessionUser?.ticketsRemaining ?? 3} tickets
				</div>
			</div>
		</header>

		<!-- AI Concierge panel -->
		<section class="glass mb-8 rounded-2xl p-4 sm:p-6">
			<h2
				class="mb-4 text-lg font-semibold"
				style="font-family: var(--font-display); color: var(--color-text);"
			>
				🤖 AI Concierge
			</h2>
			<div class="flex flex-col gap-3 sm:flex-row">
				<input
					type="text"
					placeholder='Try "a tense sci-fi thriller from the 90s"…'
					value={selectionLoungeViewModel.conciergePrompt}
					oninput={(e) =>
						selectionLoungeViewModel.setConciergePrompt(
							(e.currentTarget as HTMLInputElement).value,
						)}
					onkeydown={(e) => {
						if (e.key === 'Enter') selectionLoungeViewModel.submitConciergePrompt();
					}}
					disabled={selectionLoungeViewModel.isConciergeLoading}
					class="flex-1 rounded-lg border bg-transparent px-4 py-3 text-sm outline-none transition placeholder:opacity-40 focus:ring-2 disabled:opacity-50"
					style="color: var(--color-text); border-color: var(--color-border); --tw-ring-color: var(--color-primary);"
				/>
				<button
					type="button"
					onclick={selectionLoungeViewModel.submitConciergePrompt}
					disabled={selectionLoungeViewModel.isConciergeLoading}
					class="rounded-lg px-5 py-3 text-sm font-semibold transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
					style="background-color: var(--color-primary); color: var(--color-bg);"
				>
					{selectionLoungeViewModel.isConciergeLoading ? '…' : 'Suggest'}
				</button>
			</div>
			{#if selectionLoungeViewModel.conciergeError}
				<p
					class="mt-3 rounded-lg px-4 py-2 text-xs"
					style="background: rgba(200,35,51,0.15); color: var(--color-accent);"
				>
					{selectionLoungeViewModel.conciergeError}
				</p>
			{/if}
		</section>

		<!-- Nominations grid -->
		{#if selectionLoungeViewModel.nominations.length === 0}
			<div class="py-20 text-center opacity-40" style="color: var(--color-text);">
				<div class="mb-3 text-5xl">🎬</div>
				<p class="text-sm">No nominations yet. Use the AI Concierge above to get started!</p>
			</div>
		{:else}
			{@const activeNominations = selectionLoungeViewModel.nominations.filter(n => !n.vetoed)}
			{@const vetoedNominations = selectionLoungeViewModel.nominations.filter(n => n.vetoed)}
			<div class="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{#each [...activeNominations, ...vetoedNominations] as nomination (nomination.id)}
				<NominationCard
					{nomination}
					hasVoted={selectionLoungeViewModel.sessionUser?.votedNominationIds.includes(nomination.id) ?? false}
					ticketsRemaining={selectionLoungeViewModel.sessionUser?.ticketsRemaining ?? 0}
					currentUserId={sessionService.uid}
					onVote={() => selectionLoungeViewModel.castVote({ nominationId: nomination.id })}
					onVeto={(reason) => selectionLoungeViewModel.vetoNomination({ nominationId: nomination.id, reason })}
					sessionUsers={selectionLoungeViewModel.sessionUsers || []}
				/>
			{/each}
			</div>
		{/if}

		<!-- Grand Reveal button (host only) -->
		{#if selectionLoungeViewModel.isHost && selectionLoungeViewModel.nominations.some((n) => !n.vetoed)}
			<div class="mt-12 flex justify-center">
				<button
					type="button"
					onclick={selectionLoungeViewModel.startReveal}
					class="rounded-xl px-10 py-4 text-lg font-bold tracking-wide transition-all duration-200 hover:brightness-110 active:scale-95"
					style="background-color: var(--color-primary); color: var(--color-bg); font-family: var(--font-display);"
				>
					🎬 Start the Grand Reveal
				</button>
			</div>
		{/if}
	</div>
</div>
