<script lang="ts">
// src/lib/components/NominationCard.svelte
import { FastAverageColor } from "fast-average-color";
import { getAvatarUrl } from "$lib/client/services/avatar.svelte";
import type { Nomination } from "$lib/shared/types/nomination.js";
import type { SessionUser } from "$lib/shared/types/session-user.js";

type Props = {
	nomination: Nomination;
	hasVoted: boolean;
	ticketsRemaining: number;
	currentUserId?: string;
	onVote: () => void;
	onCancelVote: () => void;
	onVeto: (reason: string) => void;
	sessionUsers: SessionUser[];
};

const { nomination, hasVoted, ticketsRemaining, currentUserId, onVote, onCancelVote, onVeto, sessionUsers }: Props = $props();

let ambientColor = $state("rgba(212,175,55,0.15)");
let ambientRgb = $state("212,175,55");
let imgEl = $state<HTMLImageElement | undefined>(undefined);
let isHovered = $state(false);
let showVetoDialog = $state(false);
let vetoReason = $state("");
let customReason = $state("");

const fac = new FastAverageColor();

const vetoPresets = ["Seen it already", "Not in the mood", "Too long", "Bad vibes"];

const canVote = $derived(!hasVoted && ticketsRemaining > 0 && !nomination.vetoed);

/** Extracts dominant colour from poster and uses it for the ambilight glow. */
const handleImageLoad = async (): Promise<void> => {
	if (!imgEl) { return; }
	try {
		const result = await fac.getColorAsync(imgEl, { algorithm: "dominant" });
		ambientRgb = `${result.value[0]},${result.value[1]},${result.value[2]}`;
		ambientColor = `rgba(${ambientRgb},0.25)`;
	} catch {
		// keep default gold
	}
};

const getUserName = (uid: string): string =>
	sessionUsers.find((u) => u.uid === uid)?.displayName || "Unknown";

const getUserAvatar = (uid: string): string => {
	const user = sessionUsers.find((u) => u.uid === uid);
	return user ? getAvatarUrl(user) : "";
};
</script>

<!-- ─── Card ─── -->
<article
	class="group relative flex flex-col overflow-hidden rounded-2xl transition-all duration-500"
	class:opacity-50={nomination.vetoed}
	onmouseenter={() => (isHovered = true)}
	onmouseleave={() => (isHovered = false)}
	style="
		border: 1px solid rgba({ambientRgb},0.2);
		background: linear-gradient(160deg, rgba(18,18,23,0.95) 0%, rgba(10,10,14,0.98) 100%);
		box-shadow: {isHovered && !nomination.vetoed
			? `0 0 40px rgba(${ambientRgb},0.35), 0 8px 32px rgba(0,0,0,0.6)`
			: '0 2px 12px rgba(0,0,0,0.4)'};
		transform: {isHovered && !nomination.vetoed ? 'translateY(-4px) scale(1.015)' : 'none'};
	"
>
	<!-- Ambilight backdrop blur glow behind poster -->
	{#if isHovered && !nomination.vetoed}
		<div
			class="pointer-events-none absolute -inset-px rounded-2xl opacity-60 blur-xl transition-opacity duration-500"
			style="background: radial-gradient(ellipse at 50% 0%, rgba({ambientRgb},0.5) 0%, transparent 70%);"
			aria-hidden="true"
		></div>
	{/if}

	<!-- Poster -->
	<div class="relative flex-shrink-0 overflow-hidden" style="height: 220px;">
		{#if nomination.posterUrl}
			<img
				bind:this={imgEl}
				src={nomination.posterUrl}
				alt="Poster for {nomination.title}"
				crossorigin="anonymous"
				onload={handleImageLoad}
				class="h-full w-full object-cover transition-transform duration-700"
				style="transform: {isHovered && !nomination.vetoed ? 'scale(1.08)' : 'scale(1)'};"
			/>
			<!-- gradient overlay -->
			<div
				class="pointer-events-none absolute inset-0"
				style="background: linear-gradient(to top, rgba(10,10,14,0.95) 0%, rgba(10,10,14,0.3) 50%, transparent 100%);"
			></div>
		{:else}
			<div
				class="flex h-full w-full items-center justify-center text-5xl"
				style="background: rgba(255,255,255,0.03);"
			>🎬</div>
		{/if}

		<!-- Vetoed ribbon -->
		{#if nomination.vetoed}
			<div
				class="absolute inset-0 flex items-center justify-center"
				style="background: rgba(200,35,51,0.15); backdrop-filter: blur(2px);"
			>
				<div
					class="rotate-[-20deg] rounded px-4 py-1 text-lg font-black uppercase tracking-widest"
					style="border: 2px solid var(--color-accent); color: var(--color-accent); text-shadow: 0 0 20px rgba(200,35,51,0.8);"
				>
					Vetoed
				</div>
			</div>
		{/if}

		<!-- Vote count pill — top right -->
		<div
			class="absolute right-2 top-2 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold backdrop-blur-sm"
			style="background: rgba(0,0,0,0.6); color: var(--color-primary); border: 1px solid rgba({ambientRgb},0.3);"
		>
			🎟 {nomination.votes}
		</div>

		<!-- Nominated by — bottom left over poster -->
		{#if nomination.nominatedByUid}
			<div
				class="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full px-2 py-1"
				style="background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.08);"
			>
				<img
					src={getUserAvatar(nomination.nominatedByUid)}
					alt={getUserName(nomination.nominatedByUid)}
					class="h-5 w-5 rounded-full object-cover ring-1"
					style="ring-color: rgba({ambientRgb},0.5);"
				/>
				<span class="text-xs font-medium" style="color: rgba(255,255,255,0.8);">
					{getUserName(nomination.nominatedByUid)}
				</span>
			</div>
		{/if}
	</div>

	<!-- Content -->
	<div class="flex flex-1 flex-col p-4">
		<!-- Title + meta -->
		<h3
			class="mb-0.5 text-base font-bold leading-snug"
			class:line-through={nomination.vetoed}
			style="font-family: var(--font-display); color: var(--color-text);"
		>
			{nomination.title}
		</h3>
		<p class="mb-3 text-xs" style="color: rgba(255,255,255,0.4);">
			{nomination.genre} · {nomination.year} · ⭐ {nomination.rating}
		</p>

		<!-- Voters strip -->
		{#if nomination.voters && nomination.voters.length > 0}
			<div class="mb-3 flex items-center gap-1">
				<div class="flex -space-x-2">
					{#each nomination.voters.slice(0, 6) as voter}
						<img
							src={getUserAvatar(voter.uid)}
							alt={voter.displayName}
							title={voter.displayName}
							class="h-6 w-6 rounded-full object-cover ring-1 ring-black"
						/>
					{/each}
					{#if nomination.voters.length > 6}
						<div
							class="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ring-1 ring-black"
							style="background: rgba({ambientRgb},0.4); color: var(--color-text);"
						>
							+{nomination.voters.length - 6}
						</div>
					{/if}
				</div>
				<span class="text-xs" style="color: rgba(255,255,255,0.35);">voted</span>
			</div>
		{/if}

		<!-- Synopsis -->
		<p class="mb-4 line-clamp-3 flex-1 text-xs leading-relaxed" style="color: rgba(255,255,255,0.5);">
			{nomination.synopsis}
		</p>

		<!-- Actions -->
		{#if !nomination.vetoed}
			<div class="flex items-center gap-2">
				<!-- Vote / Cancel vote -->
				{#if hasVoted}
					<button
						type="button"
						onclick={onCancelVote}
						class="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition-all duration-200 active:scale-95"
						style="background: rgba({ambientRgb},0.15); color: rgba({ambientRgb},1); border: 1px solid rgba({ambientRgb},0.4);"
					>
						✓ Voted · Undo
					</button>
				{:else}
					<button
						type="button"
						onclick={onVote}
						disabled={!canVote}
						class="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition-all duration-200 hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
						style="background: linear-gradient(135deg, rgba({ambientRgb},0.8) 0%, rgba({ambientRgb},1) 100%); color: #08080a; box-shadow: 0 2px 12px rgba({ambientRgb},0.4);"
					>
						🎟 Vote
					</button>
				{/if}

				<!-- Veto -->
				<button
					type="button"
					onclick={() => (showVetoDialog = true)}
					class="rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all duration-200 hover:bg-red-900/20 active:scale-95"
					style="color: var(--color-accent); border-color: rgba(200,35,51,0.3);"
					title="Veto this movie"
				>
					✗
				</button>
			</div>
		{:else if nomination.vetoReason}
			<p class="text-xs italic" style="color: rgba(200,35,51,0.7);">
				"{nomination.vetoReason}"
			</p>
		{/if}
	</div>
</article>

<!-- ─── Veto dialog ─── -->
{#if showVetoDialog}
	<div
		class="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
		style="background: rgba(0,0,0,0.8); backdrop-filter: blur(8px);"
		onclick={(e) => { if (e.target === e.currentTarget) { showVetoDialog = false; } }}
		onkeydown={(e) => { if (e.key === "Escape") { showVetoDialog = false; } }}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<div
			class="w-full rounded-t-3xl p-6 sm:max-w-md sm:rounded-3xl"
			style="background: linear-gradient(160deg, #141418 0%, #0e0e12 100%); border: 1px solid rgba(200,35,51,0.2);"
		>
			<div class="mb-1 text-center text-2xl">🚫</div>
			<h3 class="mb-1 text-center text-lg font-bold" style="font-family: var(--font-display); color: var(--color-text);">
				Veto "{nomination.title}"?
			</h3>
			<p class="mb-5 text-center text-xs" style="color: rgba(255,255,255,0.4);">Choose a reason or type your own</p>

			<div class="mb-4 grid grid-cols-2 gap-2">
				{#each vetoPresets as preset}
					<button
						type="button"
						onclick={() => { vetoReason = preset; customReason = ""; }}
						class="rounded-xl px-3 py-2.5 text-xs font-medium transition-all"
						style="
							background: {vetoReason === preset ? 'rgba(200,35,51,0.2)' : 'rgba(255,255,255,0.05)'};
							border: 1px solid {vetoReason === preset ? 'rgba(200,35,51,0.5)' : 'rgba(255,255,255,0.08)'};
							color: {vetoReason === preset ? 'var(--color-accent)' : 'rgba(255,255,255,0.7)'};
						"
					>
						{preset}
					</button>
				{/each}
			</div>

			<input
				type="text"
				placeholder="Or type a custom reason…"
				value={customReason}
				oninput={(e) => { customReason = (e.target as HTMLInputElement).value; vetoReason = customReason; }}
				class="mb-4 w-full rounded-xl border bg-transparent px-4 py-2.5 text-sm outline-none transition-all focus:ring-1"
				style="color: var(--color-text); border-color: rgba(255,255,255,0.1); --tw-ring-color: rgba(200,35,51,0.5);"
			/>

			<button
				type="button"
				onclick={() => {
					if (vetoReason.trim()) {
						onVeto(vetoReason);
						showVetoDialog = false;
						vetoReason = "";
						customReason = "";
					}
				}}
				disabled={!vetoReason.trim()}
				class="mb-2 w-full rounded-xl py-3 text-sm font-bold transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-30"
				style="background: var(--color-accent); color: white;"
			>
				Confirm Veto
			</button>
			<button
				type="button"
				onclick={() => { showVetoDialog = false; vetoReason = ""; customReason = ""; }}
				class="w-full rounded-xl py-2.5 text-sm transition-all hover:bg-white/5"
				style="color: rgba(255,255,255,0.4);"
			>
				Cancel
			</button>
		</div>
	</div>
{/if}
