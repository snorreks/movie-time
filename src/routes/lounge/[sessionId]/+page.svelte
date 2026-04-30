<script lang="ts">
// src/routes/lounge/[sessionId]/+page.svelte
import { fade, fly, scale } from "svelte/transition";
import { onMount } from "svelte";
import { sessionService } from "$lib/client/services/session.svelte";
import { selectionLoungeViewModel } from "$lib/viewmodels/selection-lounge.viewmodel.svelte";
import { getAvatarUrl } from "$lib/client/services/avatar.svelte";
import NominationCard from "$lib/components/NominationCard.svelte";
import GrandReveal from "$lib/components/GrandReveal.svelte";
import Snackbar from "$lib/components/Snackbar.svelte";

let { data } = $props<{
	data: {
		session: import("$types").Session;
		sessionUser: import("$types").SessionUser | null;
		pageUrl: string;
	};
}>();

onMount(() => {
	selectionLoungeViewModel.initialize({
		sessionId: data.session.id,
		ssrSession: data.session,
		ssrSessionUser: data.sessionUser,
	});
});

onMount(() => {
	selectionLoungeViewModel.initialize({
		sessionId: data.session.id,
		ssrSession: data.session,
		ssrSessionUser: data.sessionUser,
	});
});
</script>

<svelte:head>
	<title>
		{selectionLoungeViewModel.view === "join"
			? `Join ${data.session.name ? `${data.session.name} — ` : ""}The Director's Lounge`
			: `The Director's Lounge${selectionLoungeViewModel.session?.name ? ` — ${selectionLoungeViewModel.session.name}` : ""}`}
	</title>
	<meta name="description" content="Join a movie night lounge and vote for the perfect film to watch with friends." />
	<!-- Open Graph -->
	<meta property="og:title" content={selectionLoungeViewModel.session?.name ? `${selectionLoungeViewModel.session.name} — Movie Night` : "The Director's Lounge — Movie Night"} />
	<meta property="og:description" content="Join the lounge, nominate movies, vote with golden tickets, and let the AI Concierge pick the perfect watch!" />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={data.pageUrl} />
	<meta property="og:image" content="{new URL('/og-image.svg', data.pageUrl).href}" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:site_name" content="The Director's Lounge" />
	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={selectionLoungeViewModel.session?.name ? `${selectionLoungeViewModel.session.name} — Movie Night` : "The Director's Lounge — Movie Night"} />
	<meta name="twitter:description" content="Join the lounge, nominate movies, vote with golden tickets, and let the AI Concierge pick the perfect watch!" />
	<meta name="twitter:image" content="{new URL('/og-image.svg', data.pageUrl).href}" />
</svelte:head>

<!-- ═══════════════════════════ LOADING ═══════════════════════════ -->
{#if selectionLoungeViewModel.view === "loading"}
	<div
		class="flex min-h-screen items-center justify-center"
		style="background-color: var(--color-bg);"
		out:fade={{ duration: 200 }}
	>
		<div class="text-center">
			<div class="mb-4 animate-pulse text-5xl">🎬</div>
			<p class="text-sm" style="color: rgba(255,255,255,0.3);">Entering the lounge…</p>
		</div>
	</div>

<!-- ═══════════════════════════ JOIN ═══════════════════════════ -->
{:else if selectionLoungeViewModel.view === "join"}
	<main
		class="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12"
		style="background: radial-gradient(ellipse at 50% 0%, #1a1426 0%, #08080a 60%);"
		in:fade={{ duration: 400 }}
	>
		<!-- Ambient orbs -->
		<div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
			<div class="absolute left-1/4 top-1/4 h-64 w-64 rounded-full opacity-20 blur-3xl" style="background: var(--color-primary);"></div>
			<div class="absolute bottom-1/4 right-1/4 h-48 w-48 rounded-full opacity-10 blur-3xl" style="background: #8b5cf6;"></div>
		</div>

		<div class="relative z-10 w-full max-w-sm" in:fly={{ y: 24, duration: 600, delay: 100 }}>
			<!-- Logo -->
			<div class="mb-10 text-center">
				<div class="mb-5 inline-flex h-20 w-20 items-center justify-center rounded-3xl text-4xl" style="background: rgba(212,175,55,0.1); border: 1px solid rgba(212,175,55,0.2);">🎬</div>
				<h1 class="text-4xl font-bold tracking-tight" style="font-family: var(--font-display); color: var(--color-primary);">
					The Director's<br />Lounge
				</h1>
				{#if data.session.name}
					<p class="mt-3 inline-block rounded-full px-4 py-1.5 text-sm font-semibold" style="background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.2); color: var(--color-primary);">
						{data.session.name}
					</p>
				{/if}
			</div>

			<!-- Card -->
			<div
				class="rounded-3xl p-7"
				style="background: rgba(20,20,26,0.9); border: 1px solid rgba(255,255,255,0.07); backdrop-filter: blur(24px); box-shadow: 0 24px 64px rgba(0,0,0,0.6);"
				in:fly={{ y: 32, duration: 600, delay: 200 }}
			>
				<label for="username" class="mb-2 block text-xs font-semibold uppercase tracking-widest" style="color: rgba(255,255,255,0.4);">
					Your Name
				</label>
				<div class="relative mb-5">
					<input
						id="username"
						type="text"
						placeholder="e.g. Kubrick"
						maxlength="30"
						value={selectionLoungeViewModel.username}
						oninput={(e) => selectionLoungeViewModel.setUsername((e.currentTarget as HTMLInputElement).value)}
						onkeydown={(e) => { if (e.key === "Enter" && selectionLoungeViewModel.username.trim()) { selectionLoungeViewModel.joinLounge(); } }}
						class="w-full rounded-2xl border bg-transparent py-4 pl-5 pr-4 text-sm outline-none transition-all placeholder:opacity-30 focus:ring-2"
						style="color: var(--color-text); border-color: rgba(255,255,255,0.1); --tw-ring-color: rgba(212,175,55,0.4); --tw-ring-offset-color: transparent;"
					/>
				</div>

				<button
					type="button"
					onclick={selectionLoungeViewModel.joinLounge}
					disabled={selectionLoungeViewModel.isJoinLoading || !selectionLoungeViewModel.username.trim()}
					class="relative w-full overflow-hidden rounded-2xl px-6 py-4 text-sm font-bold transition-all duration-300 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
					style="background: linear-gradient(135deg, #c9a227 0%, #f5e6a3 50%, #c9a227 100%); color: #08080a; box-shadow: 0 4px 24px rgba(212,175,55,0.35);"
				>
					{#if selectionLoungeViewModel.isJoinLoading}
						<span class="inline-block animate-spin">⏳</span>
					{:else}
						🚪 Join Lounge
					{/if}
				</button>

				{#if selectionLoungeViewModel.joinError}
					<p
						class="mt-4 rounded-xl p-3 text-xs"
						style="background: rgba(200,35,51,0.1); border: 1px solid rgba(200,35,51,0.25); color: var(--color-accent);"
						in:fly={{ y: 6, duration: 250 }}
					>
						⚠ {selectionLoungeViewModel.joinError}
					</p>
				{/if}
			</div>
		</div>
	</main>

<!-- ═══════════════════════════ REVEAL ═══════════════════════════ -->
{:else if selectionLoungeViewModel.view === "reveal"}
	<GrandReveal
		nominations={selectionLoungeViewModel.nominations}
		winnerNominationId={selectionLoungeViewModel.session?.winnerNominationId ?? ""}
		sessionUsers={selectionLoungeViewModel.sessionUsers}
		onReset={selectionLoungeViewModel.resetReveal}
	/>

<!-- ═══════════════════════════ LOUNGE ═══════════════════════════ -->
{:else}
	<div
		class="min-h-screen"
		style="background: radial-gradient(ellipse at 50% -10%, #1a1426 0%, var(--color-bg) 50%);"
		in:fade={{ duration: 300 }}
	>
		<div class="mx-auto max-w-6xl px-4 py-8">

			<!-- ── Header ── -->
			<header class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<div class="flex items-center gap-3">
						<span class="text-2xl">🎬</span>
						<h1 class="text-2xl font-bold sm:text-3xl" style="font-family: var(--font-display); color: var(--color-primary);">
							{selectionLoungeViewModel.session?.name || "The Director's Lounge"}
						</h1>
					</div>
					<div class="mt-2 flex items-center gap-3">
						<!-- Online users -->
						<div class="flex -space-x-2">
							{#each selectionLoungeViewModel.sessionUsers.slice(0, 6) as user}
								<img
									src={getAvatarUrl(user)}
									alt={user.displayName}
									title={user.displayName}
									class="h-7 w-7 rounded-full object-cover ring-2"
									style="ring-color: var(--color-bg);"
								/>
							{/each}
							{#if selectionLoungeViewModel.sessionUsers.length > 6}
								<div class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ring-2" style="background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.6); ring-color: var(--color-bg);">
									+{selectionLoungeViewModel.sessionUsers.length - 6}
								</div>
							{/if}
						</div>
						<span class="text-xs" style="color: rgba(255,255,255,0.3);">
							{selectionLoungeViewModel.sessionUsers.length} in the lounge
						</span>
					</div>
				</div>

				<div class="flex flex-wrap items-center gap-2">
					<!-- Golden tickets -->
					<div
						class="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold"
						style="background: rgba(212,175,55,0.1); border: 1px solid rgba(212,175,55,0.25); color: var(--color-primary);"
					>
						🎟 {selectionLoungeViewModel.sessionUser?.ticketsRemaining ?? 3}
						<span class="font-normal opacity-60 text-xs">tickets</span>
					</div>

					<!-- Pizza toggle -->
					{#if selectionLoungeViewModel.sessionUser}
						<button
							type="button"
							onclick={selectionLoungeViewModel.togglePizza}
							class="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 hover:brightness-110 active:scale-95"
							style={selectionLoungeViewModel.sessionUser.wantsPizza
								? "background: rgba(212,175,55,0.15); border: 1px solid rgba(212,175,55,0.4); color: var(--color-primary);"
								: "background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.5);"}
						>
							🍕 {selectionLoungeViewModel.sessionUser.wantsPizza ? "Pizza: Yes!" : "Pizza?"}
						</button>
					{/if}

					<!-- Pizza crowd -->
					{#if selectionLoungeViewModel.pizzaUsers.length > 0}
						<div
							class="flex items-center gap-2 rounded-full px-3 py-2 text-xs"
							style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.6);"
							title="Down for pizza: {selectionLoungeViewModel.pizzaUsers.map(u => u.displayName).join(', ')}"
						>
							<span class="font-semibold" style="color: var(--color-primary);">🍕 {selectionLoungeViewModel.pizzaUsers.length}</span>
							<div class="flex -space-x-1.5">
								{#each selectionLoungeViewModel.pizzaUsers.slice(0, 5) as user}
									<img
										src={getAvatarUrl(user)}
										alt={user.displayName}
										title={user.displayName}
										class="h-5 w-5 rounded-full object-cover ring-1"
										style="ring-color: rgba(0,0,0,0.5);"
									/>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			</header>

			<!-- ── AI Concierge ── -->
			<section
				class="mb-8 rounded-2xl p-5"
				style="background: rgba(20,20,26,0.8); border: 1px solid rgba(255,255,255,0.06); backdrop-filter: blur(20px);"
			>
				<div class="mb-4 flex items-center justify-between">
					<h2 class="text-sm font-bold uppercase tracking-widest" style="color: rgba(255,255,255,0.5);">
						{selectionLoungeViewModel.useAi ? "🤖 AI Concierge" : "🔍 Direct Search"}
					</h2>
					<!-- AI / Direct toggle -->
					<button
						type="button"
						onclick={() => selectionLoungeViewModel.setUseAi(!selectionLoungeViewModel.useAi)}
						class="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-all"
						style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.6);"
					>
						<span class={selectionLoungeViewModel.useAi ? "opacity-40" : ""}>Direct</span>
						<div class="relative h-4 w-7 rounded-full transition-colors" style="background: {selectionLoungeViewModel.useAi ? 'rgba(212,175,55,0.7)' : 'rgba(255,255,255,0.15)'};">
							<div class="absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform" style="transform: translateX({selectionLoungeViewModel.useAi ? '15px' : '2px'});"></div>
						</div>
						<span class={!selectionLoungeViewModel.useAi ? "opacity-40" : ""}>AI</span>
					</button>
				</div>

				<div class="flex gap-2">
					<input
						type="text"
						placeholder={selectionLoungeViewModel.useAi ? 'Describe a vibe — "tense 90s thriller"…' : "Movie title…"}
						value={selectionLoungeViewModel.conciergePrompt}
						oninput={(e) => selectionLoungeViewModel.setConciergePrompt((e.currentTarget as HTMLInputElement).value)}
						onkeydown={(e) => { if (e.key === "Enter") { selectionLoungeViewModel.submitConciergePrompt(); } }}
						disabled={selectionLoungeViewModel.isConciergeLoading}
						class="flex-1 rounded-xl border bg-transparent px-4 py-3 text-sm outline-none transition-all placeholder:opacity-30 focus:ring-2 disabled:opacity-40"
						style="color: var(--color-text); border-color: rgba(255,255,255,0.08); --tw-ring-color: rgba(212,175,55,0.4);"
					/>
					<button
						type="button"
						onclick={selectionLoungeViewModel.submitConciergePrompt}
						disabled={selectionLoungeViewModel.isConciergeLoading || !selectionLoungeViewModel.conciergePrompt.trim()}
						class="rounded-xl px-5 py-3 text-sm font-semibold transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
						style="background: var(--color-primary); color: #08080a; box-shadow: 0 2px 16px rgba(212,175,55,0.3);"
					>
						{selectionLoungeViewModel.isConciergeLoading ? "…" : selectionLoungeViewModel.useAi ? "Suggest" : "Search"}
					</button>
				</div>

				{#if selectionLoungeViewModel.conciergeError}
					<p class="mt-3 rounded-lg px-3 py-2 text-xs" style="background: rgba(200,35,51,0.1); color: var(--color-accent);" in:fly={{ y: 4, duration: 200 }}>
						{selectionLoungeViewModel.conciergeError}
					</p>
				{/if}
			</section>

			<!-- ── Nominations ── -->
			{#if selectionLoungeViewModel.nominations.length === 0}
				<div class="py-24 text-center" in:fade={{ duration: 400 }}>
					<div class="mb-4 text-6xl opacity-20">🎬</div>
					<p class="text-sm" style="color: rgba(255,255,255,0.3);">No nominations yet — be the first!</p>
				</div>
			{:else}
				{@const active = selectionLoungeViewModel.nominations.filter((n) => !n.vetoed)}
				{@const vetoed = selectionLoungeViewModel.nominations.filter((n) => n.vetoed)}
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
					{#each [...active, ...vetoed] as nomination (nomination.id)}
						<div in:scale={{ duration: 300, start: 0.95 }}>
							<NominationCard
								{nomination}
								hasVoted={selectionLoungeViewModel.sessionUser?.votedNominationIds.includes(nomination.id) ?? false}
								ticketsRemaining={selectionLoungeViewModel.sessionUser?.ticketsRemaining ?? 0}
								currentUserId={sessionService.uid}
								canDelete={nomination.nominatedByUid === sessionService.uid}
								onVote={() => selectionLoungeViewModel.castVote({ nominationId: nomination.id })}
								onCancelVote={() => selectionLoungeViewModel.cancelVote({ nominationId: nomination.id })}
								onVeto={(reason) => selectionLoungeViewModel.vetoNomination({ nominationId: nomination.id, reason })}
								onDelete={() => selectionLoungeViewModel.deleteNomination({ nominationId: nomination.id })}
								sessionUsers={selectionLoungeViewModel.sessionUsers}
							/>
						</div>
					{/each}
				</div>
			{/if}

		<!-- ── Grand Reveal button ── -->
		{#if selectionLoungeViewModel.isHost}
			{#if selectionLoungeViewModel.canStartReveal}
				<div class="mt-16 flex justify-center pb-12" in:fly={{ y: 12, duration: 400 }}>
					<button
						type="button"
						onclick={selectionLoungeViewModel.startReveal}
						class="group relative overflow-hidden rounded-2xl px-12 py-5 text-lg font-bold tracking-wide transition-all duration-300 hover:scale-105 active:scale-[0.98]"
						style="background: linear-gradient(135deg, #c9a227 0%, #f5e6a3 50%, #c9a227 100%); color: #08080a; font-family: var(--font-display); box-shadow: 0 8px 40px rgba(212,175,55,0.5);"
					>
						<div class="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"></div>
						🎬 Spin the Wheel
					</button>
				</div>
			{/if}
		{:else if selectionLoungeViewModel.nominations.some((n) => !n.vetoed)}
			<div class="mt-16 flex justify-center pb-12" in:fly={{ y: 12, duration: 400 }}>
				<div
					class="rounded-2xl px-8 py-4 text-center"
					style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);"
				>
					<p class="text-sm font-medium" style="color: rgba(255,255,255,0.4);">
						⏳ Waiting for Movie Time...
					</p>
					<p class="mt-1 text-xs" style="color: rgba(255,255,255,0.25);">
						The host will spin the wheel when everyone's ready
					</p>
				</div>
			</div>
		{/if}

		</div>
	</div>
{/if}

<Snackbar />
