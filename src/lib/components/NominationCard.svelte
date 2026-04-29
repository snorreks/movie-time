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
	onVeto: (reason: string) => void;
	sessionUsers: SessionUser[];
};

const {
	nomination,
	hasVoted,
	ticketsRemaining,
	currentUserId,
	onVote,
	onVeto,
	sessionUsers,
}: Props = $props();

let ambilightColor = $state("transparent");
let imgEl = $state<HTMLImageElement | undefined>(undefined);
let showVetoDialog = $state(false);
let vetoReason = $state("");
let customReason = $state("");
let isHovered = $state(false);

const fac = new FastAverageColor();

const vetoReasons = [
	"Seen it before",
	"The movie is... not my taste",
	"Too long",
	"Not in the mood",
];

/**
 * Extracts the dominant colour from the poster image and sets it as the
 * ambilight box-shadow value.
 */
const handleImageLoad = async (): Promise<void> => {
	if (!imgEl) {
		return;
	}
	try {
		const result = await fac.getColorAsync(imgEl);
		ambilightColor = result.hex;
	} catch {
		ambilightColor = "transparent";
	}
};

const canVote = $derived(
	!hasVoted && ticketsRemaining > 0 && !nomination.vetoed,
);

const handleVeto = () => {
	if (vetoReason === "Other") {
		// Keep dialog open for custom input
		return;
	}
	onVeto(vetoReason);
	showVetoDialog = false;
	vetoReason = "";
};

const getUserName = (uid: string): string => {
	const user = sessionUsers.find((u) => u.uid === uid);
	return user?.displayName || "Unknown";
};

// Get avatar URL for a user using the avatar service
const getUserAvatar = (uid: string): string => {
	const user = sessionUsers.find((u) => u.uid === uid);
	if (!user) return "";
	return getAvatarUrl(user);
};
</script>

<article
	class="glass group relative flex flex-col overflow-hidden rounded-xl transition-all duration-300"
	class:opacity-60={nomination.vetoed}
	class:scale-105={isHovered && !nomination.vetoed}
	class:shadow-2xl={isHovered && !nomination.vetoed}
	class:border-primary={isHovered && !nomination.vetoed}
	onmouseenter={() => (isHovered = true)}
	onmouseleave={() => (isHovered = false)}
	style="border: 1px solid transparent;"
>
	<!-- Poster with ambilight glow -->
	<div class="relative flex-shrink-0">
		{#if nomination.posterUrl}
			<img
				bind:this={imgEl}
				src={nomination.posterUrl}
				alt="Poster for {nomination.title}"
				crossorigin="anonymous"
				onload={handleImageLoad}
				class="h-56 w-full object-cover transition-transform duration-300"
				class:scale-110={isHovered}
			/>
		{:else}
			<div class="flex h-56 w-full items-center justify-center text-4xl" style="background: rgba(255,255,255,0.03);">
				🎬
			</div>
		{/if}

		<!-- Veto badge -->
		{#if nomination.vetoed}
			<div
				class="absolute left-2 top-2 rounded px-2 py-0.5 text-xs font-bold uppercase tracking-widest"
				style="background-color: var(--color-accent); color: var(--color-text);"
				title="Vetoed by {nomination.vetoedByName || getUserName(nomination.vetoedByUid || '')}: {nomination.vetoReason || 'No reason'}"
			>
				Vetoed
			</div>
		{/if}

		<!-- Nominated by badge -->
		{#if nomination.nominatedByUid}
			<div class="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-1" style="backdrop-filter: blur(4px);">
				{@html getUserAvatar(nomination.nominatedByUid)}
				<span class="text-xs" style="color: var(--color-text);">{nomination.nominatedByName || getUserName(nomination.nominatedByUid)}</span>
			</div>
		{/if}
	</div>

	<!-- Content -->
	<div class="flex flex-1 flex-col p-4">
		<!-- Title -->
		<h3
			class="mb-1 text-base font-semibold leading-snug"
			class:line-through={nomination.vetoed}
			style="font-family: var(--font-display); color: var(--color-text);"
		>
			{nomination.title}
		</h3>

		<!-- Meta -->
		<p class="mb-2 text-xs opacity-50" style="color: var(--color-text);">
			{nomination.genre} · {nomination.year} · ⭐ {nomination.rating}
		</p>

		<!-- Voters (if any) -->
		{#if nomination.voters && nomination.voters.length > 0}
			<div class="mb-2 flex flex-wrap gap-1">
				<span class="text-xs opacity-60" style="color: var(--color-text);">Voted by:</span>
				{#each nomination.voters as voter}
					<div class="flex items-center gap-1" title={voter.displayName}>
						{@html getUserAvatar(voter.uid)}
					</div>
				{/each}
			</div>
		{/if}

		<!-- Synopsis -->
		<p class="mb-4 line-clamp-3 flex-1 text-xs leading-relaxed opacity-60" style="color: var(--color-text);">
			{nomination.synopsis}
		</p>

		<!-- Actions -->
		<div class="flex items-center justify-between gap-2">
			<!-- Vote count + button -->
			{#if !nomination.vetoed}
				<div class="flex items-center gap-2">
					<span class="text-sm font-bold" style="color: var(--color-primary);">
						🎟 {nomination.votes}
					</span>
					<button
						type="button"
						onclick={onVote}
						disabled={!canVote}
						class="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
						style={hasVoted
							? 'background: rgba(212,175,55,0.25); color: var(--color-primary); border: 1px solid var(--color-primary);'
							: 'background-color: var(--color-primary); color: var(--color-bg);'}
					>
						{hasVoted ? '✓ Voted' : 'Vote'}
					</button>
				</div>
			{:else}
				<span class="text-sm opacity-40" style="color: var(--color-text);">
					🎟 {nomination.votes} votes (vetoed)
				</span>
			{/if}

			<!-- Veto button -->
			{#if !nomination.vetoed}
				<button
					type="button"
					onclick={() => (showVetoDialog = true)}
					class="rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all hover:bg-red-900/20 active:scale-95"
					style="color: var(--color-accent); border-color: var(--color-accent);"
					title="Veto this movie"
				>
					Veto
				</button>
			{/if}
		</div>
	</div>
</article>

	<!-- Veto Reason Dialog -->
{#if showVetoDialog}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70" style="backdrop-filter: blur(4px);">
		<div class="glass rounded-2xl p-6 max-w-md w-full mx-4">
			<h3 class="mb-4 text-lg font-bold" style="color: var(--color-text); font-family: var(--font-display);">
				Veto Movie
			</h3>
			<p class="mb-4 text-sm opacity-60" style="color: var(--color-text);">
				Why are you vetoing "{nomination.title}"?
			</p>
			<div class="flex flex-col gap-2 mb-4">
				{#each vetoReasons as reason}
					<button
						type="button"
						onclick={() => {
							vetoReason = reason;
						}}
						class="rounded-lg border px-4 py-2 text-sm text-left transition-all hover:bg-white/10"
						style="color: var(--color-text); border-color: var(--color-border); {vetoReason === reason ? 'background: rgba(212,175,55,0.2);' : ''}"
					>
						{reason}
					</button>
				{/each}
			</div>
			<div class="mb-4">
				<input
					type="text"
					placeholder="Or type a custom reason..."
					value={customReason}
					oninput={(e) => {
						customReason = (e.target as HTMLInputElement).value;
						vetoReason = customReason;
					}}
					class="w-full rounded-lg border bg-transparent px-4 py-2 text-sm outline-none"
					style="color: var(--color-text); border-color: var(--color-border);"
				/>
			</div>
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
				class="w-full rounded-lg px-4 py-2 text-sm font-semibold"
				style="background-color: var(--color-accent); color: var(--color-text);"
			>
				Confirm Veto
			</button>
			<button
				type="button"
				onclick={() => {
					showVetoDialog = false;
					vetoReason = "";
					customReason = "";
				}}
				class="mt-2 w-full rounded-lg px-4 py-2 text-sm"
				style="color: var(--color-text); opacity: 0.6;"
			>
				Cancel
			</button>
		</div>
	</div>
{/if}
