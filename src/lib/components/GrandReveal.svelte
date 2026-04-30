<script lang="ts">
// src/lib/components/GrandReveal.svelte

import { FastAverageColor } from "fast-average-color";
import { onMount } from "svelte";
import { fade, fly, scale } from "svelte/transition";
import { getAvatarUrl } from "$lib/client/services/avatar.svelte";
import type { Nomination } from "$lib/shared/types/nomination.js";
import type { SessionUser } from "$lib/shared/types/session-user.js";
import { logger } from "$logger";

type Props = {
	nominations: Nomination[];
	winnerNominationId: string;
	sessionUsers: SessionUser[];
	/** Called when the "ff" key chord is pressed — resets the session to lobby. */
	onReset: () => void;
};

const { nominations, winnerNominationId, sessionUsers, onReset }: Props =
	$props();

// ─── Reel maths ─────────────────────────────────────────────────
const REEL_REPEATS = 15;
const CARD_W = 156;
const CARD_GAP = 10;
const CARD_STEP = CARD_W + CARD_GAP;

// 1. Create a "base block" of cards where movies with more votes appear more often.
// We interleave them so identical movies aren't stuck right next to each other.
const baseBlock = $derived.by(() => {
	const block: typeof nominations = [];
	// Every movie gets at least 1 card. If it has 2 votes, it gets 2 cards, etc.
	const counts = nominations.map((n) => Math.max(1, n.votes || 0));
	const maxCardsForAnyMovie = Math.max(...counts, 0);

	for (let i = 0; i < maxCardsForAnyMovie; i++) {
		nominations.forEach((n, idx) => {
			// If this movie still has cards left to deal, add it to the block
			if (counts[idx] > i) {
				block.push(n);
			}
		});
	}
	return block;
});

// 2. Find where the winner is inside our new weighted block
// (Finding the first occurrence is fine, the math will land on it perfectly)
const winnerIndex = $derived(
	baseBlock.findIndex((n) => n.id === winnerNominationId),
);

// 3. Build the full reel by repeating the weighted base block
const reelItems = $derived(
	baseBlock.length > 0
		? [...Array(REEL_REPEATS + 1).keys()].flatMap((r) =>
				baseBlock.map((n, i) => ({ ...n, reelKey: `${r}-${i}` })),
			)
		: [],
);

// 4. Calculate the target X translation based on the size of the base block
const targetReelIndex = $derived(REEL_REPEATS * baseBlock.length + winnerIndex);
const targetTranslateX = $derived(
	-(targetReelIndex * CARD_STEP - CARD_STEP * 3),
);

// ─── Animation state ─────────────────────────────────────────────
let animationDone = $state(false);
let reelEl = $state<HTMLDivElement | undefined>(undefined);
let winnerImgEl = $state<HTMLImageElement | undefined>(undefined);
let winnerAmbientRgb = $state("212,175,55");

const winner = $derived(nominations.find((n) => n.id === winnerNominationId));

const fac = new FastAverageColor();

const extractWinnerColor = async (): Promise<void> => {
	if (!winnerImgEl) {
		return;
	}
	try {
		const result = await fac.getColorAsync(winnerImgEl, {
			algorithm: "dominant",
		});
		winnerAmbientRgb = `${result.value[0]},${result.value[1]},${result.value[2]}`;
	} catch {
		// keep default gold
	}
};

// ─── Audio ───────────────────────────────────────────────────────
let spinAudio: HTMLAudioElement | undefined;
let winAudio: HTMLAudioElement | undefined;
let audioUnlocked = false;
let confettiFired = false;

const unlockAudio = (): void => {
	if (audioUnlocked) {
		return;
	}
	audioUnlocked = true;
	if (spinAudio) {
		spinAudio.muted = false;
	}
	if (winAudio) {
		winAudio.muted = false;
	}
};

onMount(() => {
	spinAudio = new Audio("/sounds/wheel-spin.mp3");
	winAudio = new Audio("/sounds/winner.mp3");
	// spinAudio.muted = true;
	// winAudio.muted = true;
	spinAudio.volume = 0.5;
	winAudio.volume = 0.7;

	window.addEventListener("pointerdown", unlockAudio, { once: true });
	window.addEventListener("keydown", unlockAudio, { once: true });
	return () => {
		window.removeEventListener("pointerdown", unlockAudio);
		window.removeEventListener("keydown", unlockAudio);
	};
});

// ─── "ff" reset chord ────────────────────────────────────────────
let _keyBuf = "";
let _keyTimer: ReturnType<typeof setTimeout> | undefined;

const handleKeydown = (e: KeyboardEvent): void => {
	if (
		e.target instanceof HTMLInputElement ||
		e.target instanceof HTMLTextAreaElement
	) {
		return;
	}
	_keyBuf += e.key.toLowerCase();
	clearTimeout(_keyTimer);
	_keyTimer = setTimeout(() => {
		_keyBuf = "";
	}, 1000);
	if (_keyBuf.endsWith("ff")) {
		logger.info("[GrandReveal] 'ff' chord — resetting");
		_keyBuf = "";
		clearTimeout(_keyTimer);
		onReset();
	}
};

// ─── Reel animation ──────────────────────────────────────────────
$effect(() => {
	if (!reelEl || nominations.length === 0 || winnerIndex === -1) {
		logger.warn("[GrandReveal] Can't start reel:", {
			hasEl: !!reelEl,
			count: nominations.length,
			winnerIndex,
		});
		return;
	}
	logger.info(
		"[GrandReveal] Starting reel — winner:",
		winner?.title,
		"targetX:",
		targetTranslateX,
	);

	reelEl.style.transition = "none";
	reelEl.style.transform = "translateX(0px)";
	void reelEl.offsetWidth;
	reelEl.style.transition = "transform 7s cubic-bezier(0.22, 1, 0.36, 1)";
	reelEl.style.transform = `translateX(${targetTranslateX}px)`;

	spinAudio?.play().catch(() => {});

	const onEnd = () => {
		logger.info("[GrandReveal] Reel settled — revealing winner");
		animationDone = true;
		spinAudio?.pause();
		if (spinAudio) {
			spinAudio.currentTime = 0;
		}
		winAudio?.play().catch(() => {});

		if (!confettiFired) {
			confettiFired = true;
			import("canvas-confetti")
				.then((m) => {
					const confetti = m.default || m;
					confetti({
						particleCount: 120,
						spread: 80,
						origin: { y: 0.55 },
						colors: ["#d4af37", "#f5e6a3", "#ffffff"],
					});
					setTimeout(
						() =>
							confetti({
								particleCount: 60,
								spread: 120,
								origin: { y: 0.4 },
								scalar: 1.4,
							}),
						600,
					);
				})
				.catch(() => {});
		}
	};

	reelEl.addEventListener("transitionend", onEnd, { once: true });
	return () => {
		reelEl?.removeEventListener("transitionend", onEnd);
	};
});

const getUserAvatar = (uid: string): string => {
	const user = sessionUsers.find((u) => u.uid === uid);
	return user ? getAvatarUrl(user) : "";
};
const getUserName = (uid: string): string =>
	sessionUsers.find((u) => u.uid === uid)?.displayName || "Unknown";
</script>

<svelte:window onkeydown={handleKeydown} />

<div
	class="relative flex min-h-screen flex-col items-center overflow-hidden px-4 pb-16 pt-12"
	style="background: radial-gradient(ellipse at 50% -10%, #1a1426 0%, var(--color-bg) 55%);"
>
	<!-- Ambient bg glow -->
	<div
		class="pointer-events-none absolute inset-0 transition-opacity duration-1000"
		style="background: radial-gradient(ellipse at 50% 30%, rgba({winnerAmbientRgb},0.12) 0%, transparent 65%); opacity: {animationDone ? 1 : 0};"
		aria-hidden="true"
	></div>

	<!-- Title -->
	<div class="mb-10 text-center" in:fly={{ y: -16, duration: 600 }}>
		<p class="mb-2 text-xs font-semibold uppercase tracking-widest" style="color: rgba(255,255,255,0.3);">Tonight's pick</p>
		<h2 class="text-4xl font-bold sm:text-5xl" style="font-family: var(--font-display); color: var(--color-primary); text-shadow: 0 0 40px rgba(212,175,55,0.4);">
			And the winner is…
		</h2>
	</div>

	<!-- ─── Reel ─── -->
	<div
		class="relative mb-12 w-full overflow-hidden"
		style="max-width: {CARD_STEP * 7}px;"
	>
		<!-- Fade edges -->
		<div class="pointer-events-none absolute inset-y-0 left-0 z-10 w-28" style="background: linear-gradient(90deg, var(--color-bg), transparent);" aria-hidden="true"></div>
		<div class="pointer-events-none absolute inset-y-0 right-0 z-10 w-28" style="background: linear-gradient(-90deg, var(--color-bg), transparent);" aria-hidden="true"></div>

		<!-- Center glow bar -->
		<div
			class="pointer-events-none absolute inset-y-0 left-1/2 z-20 w-0.5 -translate-x-1/2"
			style="background: var(--color-primary); box-shadow: 0 0 20px 6px rgba(212,175,55,0.6);"
			aria-hidden="true"
		></div>

		<!-- Scrolling reel -->
		<div bind:this={reelEl} class="flex will-change-transform" style="gap: {CARD_GAP}px;">
			{#each reelItems as item (item.reelKey)}
				<div
					class="relative flex-shrink-0 overflow-hidden rounded-xl transition-all duration-500"
					style="
						width: {CARD_W}px;
						box-shadow: {animationDone && item.id === winnerNominationId ? `0 0 30px rgba(${winnerAmbientRgb},0.6)` : 'none'};
						transform: {animationDone && item.id === winnerNominationId ? 'scale(1.08)' : 'scale(1)'};
						outline: {animationDone && item.id === winnerNominationId ? `2px solid rgba(${winnerAmbientRgb},0.8)` : 'none'};
					"
				>
					{#if item.posterUrl}
						<img src={item.posterUrl} alt={item.title} class="h-52 w-full object-cover" />
					{:else}
						<div class="flex h-52 w-full items-center justify-center text-3xl" style="background: rgba(255,255,255,0.05);">🎬</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>

	<!-- ─── Winner panel ─── -->
	{#if animationDone && winner}
		<div
			class="w-full max-w-lg"
			in:scale={{ duration: 500, start: 0.9 }}
		>
			<div
				class="overflow-hidden rounded-3xl"
				style="background: rgba(20,20,26,0.9); border: 1px solid rgba({winnerAmbientRgb},0.3); box-shadow: 0 0 60px rgba({winnerAmbientRgb},0.2), 0 24px 64px rgba(0,0,0,0.6); backdrop-filter: blur(24px);"
			>
				<!-- Poster strip -->
				{#if winner.posterUrl}
					<div class="relative h-64 overflow-hidden">
						<img
							bind:this={winnerImgEl}
							src={winner.posterUrl}
							alt={winner.title}
							crossorigin="anonymous"
							onload={extractWinnerColor}
							class="h-full w-full object-cover"
						/>
						<div class="absolute inset-0" style="background: linear-gradient(to top, rgba(20,20,26,1) 0%, rgba(20,20,26,0.4) 50%, transparent 100%);"></div>
						<!-- Floating title over poster -->
						<div class="absolute bottom-0 left-0 right-0 p-6">
							<p class="mb-1 text-xs font-semibold uppercase tracking-widest" style="color: rgba({winnerAmbientRgb},0.8);">🏆 Tonight's Film</p>
							<h3 class="text-3xl font-bold leading-tight" style="font-family: var(--font-display); color: #fff; text-shadow: 0 2px 16px rgba(0,0,0,0.8);">
								{winner.title}
							</h3>
						</div>
					</div>
				{/if}

				<div class="p-6">
					<!-- Meta row -->
					<div class="mb-4 flex flex-wrap items-center gap-3">
						<span class="rounded-full px-3 py-1 text-xs font-semibold" style="background: rgba({winnerAmbientRgb},0.15); color: rgba({winnerAmbientRgb},1);">
							{winner.genre}
						</span>
						<span class="text-xs" style="color: rgba(255,255,255,0.4);">{winner.year}</span>
						<span class="text-xs" style="color: rgba(255,255,255,0.4);">⭐ {winner.rating}</span>
					</div>

					<!-- Synopsis -->
					<p class="mb-5 text-sm leading-relaxed" style="color: rgba(255,255,255,0.65);">
						{winner.synopsis}
					</p>

					<!-- Voters who backed this -->
					{#if winner.voters && winner.voters.length > 0}
						<div class="flex items-center gap-2 border-t pt-4" style="border-color: rgba(255,255,255,0.07);">
							<div class="flex -space-x-2">
								{#each winner.voters as voter}
									<img
										src={getUserAvatar(voter.uid)}
										alt={voter.displayName}
										title={`${voter.displayName} voted for this`}
										class="h-8 w-8 rounded-full object-cover ring-2"
										style="ring-color: rgba(20,20,26,1);"
									/>
								{/each}
							</div>
							<p class="text-xs" style="color: rgba(255,255,255,0.4);">
								{#if winner.voters.length === 1}
									{winner.voters[0].displayName} voted for this
								{:else}
									{winner.voters.length} people voted for this
								{/if}
							</p>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>
