<script lang="ts">
// src/lib/components/GrandReveal.svelte

import { onMount } from "svelte";
import type { Nomination } from "$lib/shared/types/nomination.js";

type Props = {
	nominations: Nomination[];
	winnerNominationId: string;
};

const { nominations, winnerNominationId }: Props = $props();

// ---------------------------------------------------------------------------
// Reel setup: repeat the nominations 5× for visual density, then append a
// final copy at the end so the winner always lands inside the visible window.
// ---------------------------------------------------------------------------
const REEL_REPEATS = 5;
const CARD_WIDTH_PX = 160; // px — must match CSS below
const CARD_GAP_PX = 12;
const CARD_STEP = CARD_WIDTH_PX + CARD_GAP_PX;

const winnerIndex = $derived(
	nominations.findIndex((n) => n.id === winnerNominationId),
);

// Build the reel: [copy 0..N-1] × REEL_REPEATS, then one final copy
const reelItems = $derived(
	nominations.length > 0
		? [...Array(REEL_REPEATS + 1).keys()].flatMap((repeatIdx) =>
				nominations.map((n, i) => ({ ...n, reelKey: `${repeatIdx}-${i}` })),
			)
		: [],
);

// The target card is in the LAST (extra) copy so the reel scrolls right past
// all the repeated cards before landing on it.
const targetReelIndex = $derived(
	REEL_REPEATS * nominations.length + winnerIndex,
);

// Center the container: offset = index × step - half visible width (approx 3 cards)
const containerHalfWidth = CARD_STEP * 3;
const targetTranslateX = $derived(
	-(targetReelIndex * CARD_STEP - containerHalfWidth),
);

// Animation state
let animationDone = $state(false);
let reelEl = $state<HTMLDivElement | undefined>(undefined);
let spinAudio: HTMLAudioElement | undefined;
let winAudio: HTMLAudioElement | undefined;
let confettiFired = false;

onMount(() => {
	// Load sound effects
	spinAudio = new Audio("/sounds/wheel-spin.mp3");
	winAudio = new Audio("/sounds/winner.mp3");
	spinAudio.volume = 0.5;
	winAudio.volume = 0.7;
});

$effect(() => {
	if (!reelEl || nominations.length === 0) return;

	// Play spin sound
	if (spinAudio) {
		spinAudio.currentTime = 0;
		spinAudio.play().catch(() => {});
	}

	// Force reflow before applying the transform
	reelEl.offsetHeight;

	// Apply the final transform that triggers the CSS transition
	reelEl.style.transform = `translateX(${targetTranslateX}px)`;

	// After animation ends, mark done and play win sound
	const handler = () => {
		animationDone = true;
		if (spinAudio) {
			spinAudio.pause();
			spinAudio.currentTime = 0;
		}
		if (winAudio) {
			winAudio.play().catch(() => {});
		}

		// Fire confetti
		if (!confettiFired) {
			confettiFired = true;
			try {
				import("canvas-confetti")
					.then((module) => {
						const confetti = module.default || module;
						confetti({
							particleCount: 100,
							spread: 70,
							origin: { y: 0.6 },
						});
					})
					.catch(() => {});
			} catch (e) {
				// Confetti library might not be loaded
			}
		}
	};

	reelEl.addEventListener("transitionend", handler, { once: true });
	return () => {
		reelEl?.removeEventListener("transitionend", handler);
	};
});

const winner = $derived(nominations.find((n) => n.id === winnerNominationId));
</script>

<div class="flex flex-col items-center overflow-hidden px-4 py-12" style="background-color: var(--color-bg);">

	<!-- Title -->
	<h2
		class="mb-8 text-center text-4xl font-bold"
		style="font-family: var(--font-display); color: var(--color-primary);"
	>
		And the winner is…
	</h2>

	<!-- Reel viewport -->
	<div
		class="relative mb-10 w-full overflow-hidden"
		style="max-width: {CARD_STEP * 7}px;"
	>
		<!-- Fade edges -->
		<div
			class="pointer-events-none absolute inset-y-0 left-0 z-10 w-24"
			style="background: linear-gradient(90deg, var(--color-bg), transparent);"
			aria-hidden="true"
		></div>
		<div
			class="pointer-events-none absolute inset-y-0 right-0 z-10 w-24"
			style="background: linear-gradient(-90deg, var(--color-bg), transparent);"
			aria-hidden="true"
		></div>

		<!-- Center indicator -->
		<div
			class="pointer-events-none absolute inset-y-0 left-1/2 z-20 w-px -translate-x-1/2"
			style="background: var(--color-primary); box-shadow: 0 0 12px 3px var(--color-primary);"
			aria-hidden="true"
		></div>

		<!-- Scrolling reel -->
		<div
			bind:this={reelEl}
			class="flex will-change-transform"
			style="gap: {CARD_GAP_PX}px; transform: translateX(0px);"
		>
			{#each reelItems as item (item.reelKey)}
				<div
					class="flex-shrink-0 overflow-hidden rounded-lg transition-all duration-500"
					style="width: {CARD_WIDTH_PX}px;"
					class:scale-110={animationDone && item.id === winnerNominationId}
					class:ring-4={animationDone && item.id === winnerNominationId}
					style:--tw-ring-color="var(--color-primary)"
				>
					{#if item.posterUrl}
						<img
							src={item.posterUrl}
							alt={item.title}
							class="h-56 w-full object-cover"
						/>
					{:else}
						<div
							class="flex h-56 w-full items-center justify-center text-3xl"
							style="background: rgba(255,255,255,0.05);"
						>
							🎬
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>

	<!-- Winner reveal panel -->
	{#if animationDone && winner}
		<div class="glass max-w-md w-full rounded-2xl p-6 text-center">
			<div class="mb-1 text-xs font-semibold uppercase tracking-widest opacity-50" style="color: var(--color-text);">
				Tonight's Film
			</div>
			<h3
				class="mb-2 text-3xl font-bold"
				style="font-family: var(--font-display); color: var(--color-primary);"
			>
				{winner.title}
			</h3>
			<p class="mb-3 text-sm opacity-60" style="color: var(--color-text);">
				{winner.genre} · {winner.year} · ⭐ {winner.rating}
			</p>
			<p class="text-sm leading-relaxed opacity-80" style="color: var(--color-text);">
				{winner.synopsis}
			</p>
		</div>
	{/if}
</div>
