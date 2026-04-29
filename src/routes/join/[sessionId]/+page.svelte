<script lang="ts">
	// src/routes/join/[sessionId]/+page.svelte
	import { fade, fly } from "svelte/transition";
	import Snackbar from "$lib/components/Snackbar.svelte";
	import { joinViewModel } from "$lib/viewmodels/join.viewmodel.svelte";

	let { data } = $props<{
		data: { sessionId: string; sessionExists: boolean; sessionName?: string };
	}>();

	let showContent = $state(false);

	$effect(() => {
		if (data.sessionId) {
			joinViewModel.initialize({
				sessionId: data.sessionId,
				sessionName: data.sessionName,
				sessionExists: data.sessionExists,
			});
		}
		setTimeout(() => (showContent = true), 100);
	});
</script>

<svelte:head>
	<title>Join Lounge — The Director's Lounge</title>
</svelte:head>

<main
	class="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12"
	style="background: linear-gradient(135deg, #08080A 0%, #1a1a2e 50%, #08080A 100%);"
>
	<!-- Animated background particles -->
	<div class="pointer-events-none absolute inset-0 overflow-hidden">
		{#each Array(20) as _, i}
			<div
				class="absolute h-1 w-1 rounded-full opacity-20"
				style="background: var(--color-primary);
					left: {Math.random() * 100}%;
					top: {Math.random() * 100}%;
					animation: float {3 + Math.random() * 5}s ease-in-out infinite;"
			></div>
		{/each}
	</div>

	<!-- Ambient glow effects -->
	<div
		class="pointer-events-none absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-3xl"
		style="background: radial-gradient(circle, var(--color-primary) 0%, transparent 70%);"
		aria-hidden="true"
	></div>

	{#if showContent}
		<div
			class="relative z-10 w-full max-w-md"
			in:fly={{ y: 30, duration: 800, delay: 200 }}
			out:fade={{ duration: 300 }}
		>
			<!-- Logo / Title Section -->
			<div class="mb-12 text-center">
				<div
					class="mb-6 inline-flex items-center justify-center"
					in:fly={{ y: -20, duration: 600, delay: 300 }}
				>
					<span class="text-6xl">🎬</span>
				</div>

				<h1
					class="mb-3 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text text-5xl font-bold tracking-tight text-transparent"
					style="font-family: var(--font-display); line-height: 1.2;"
				>
					Join the
					<br />
					<span class="text-6xl">Lounge</span>
				</h1>

				{#if joinViewModel.sessionName}
					<p
						class="mt-4 rounded-full border px-4 py-2 text-sm font-semibold"
						style="color: var(--color-primary); border-color: rgba(212, 175, 55, 0.3);"
					>
						{joinViewModel.sessionName}
					</p>
				{/if}
			</div>

			{#if !joinViewModel.sessionExists}
				<!-- Error Card -->
				<div
					class="rounded-3xl border p-8 text-center shadow-2xl"
					style="background: rgba(255, 255, 255, 0.05);
						backdrop-filter: blur(20px);
						border-color: rgba(200, 35, 51, 0.3);"
				>
					<div class="mb-4 text-6xl">⚠️</div>
					<p class="text-lg font-semibold" style="color: var(--color-accent);">
						Session Not Found
					</p>
					<p class="mt-2 text-sm opacity-60" style="color: var(--color-text);">
						This session may have ended or the link is invalid.
					</p>
				</div>
			{:else}
				<!-- Join Card -->
				<div
					class="group relative overflow-hidden rounded-3xl border p-8 shadow-2xl"
					style="background: rgba(255, 255, 255, 0.05);
						backdrop-filter: blur(20px);
						border-color: rgba(212, 175, 55, 0.2);"
					in:fly={{ y: 40, duration: 800, delay: 400 }}
				>
					<div
						class="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
						style="background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%);"
					></div>

					<h2 class="mb-6 text-center text-lg font-semibold" style="color: var(--color-text);">
						Enter Your Name
					</h2>

					<div class="mb-6">
						<label
							for="username"
							class="mb-2 block text-xs font-semibold uppercase tracking-widest opacity-60"
							style="color: var(--color-text);"
						>
							Your Name
						</label>
						<div class="relative">
							<span class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg opacity-40">
								👤
							</span>
							<input
								id="username"
								type="text"
								placeholder="e.g. Kubrick"
								maxlength="30"
								value={joinViewModel.username}
								oninput={(e) => joinViewModel.setUsername((e.currentTarget as HTMLInputElement).value)}
								onkeydown={(e) => {
									if (e.key === 'Enter' && joinViewModel.username.trim()) {
										joinViewModel.joinSession();
									}
								}}
								class="w-full rounded-xl border bg-transparent py-4 pl-12 pr-4 text-sm outline-none transition-all placeholder:opacity-40 focus:ring-2 focus:ring-offset-2"
								style="color: var(--color-text);
									border-color: rgba(255,255,255,0.15);
									--tw-ring-color: var(--color-primary);
									--tw-ring-offset-color: transparent;"
							/>
						</div>
					</div>

					<button
						type="button"
						onclick={joinViewModel.joinSession}
						disabled={joinViewModel.isLoading || !joinViewModel.username.trim()}
						class="group relative w-full overflow-hidden rounded-xl px-6 py-4 text-base font-bold transition-all duration-300
							hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
						style="background: linear-gradient(135deg, #D4AF37 0%, #F5E6A3 50%, #D4AF37 100%);
							color: #08080A;
							box-shadow: 0 4px 20px rgba(212, 175, 55, 0.4);"
					>
						<div
							class="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full"
						></div>
						{#if joinViewModel.isLoading}
							<span class="inline-block animate-spin">⏳</span>
						{:else}
							🚪 Join Lounge
						{/if}
					</button>
				</div>
			{/if}

			{#if joinViewModel.error}
				<div
					class="mt-6 rounded-xl border p-4 text-sm"
					style="background: rgba(200, 35, 51, 0.15);
						border-color: rgba(200, 35, 51, 0.3);
						color: var(--color-accent);"
					in:fly={{ y: 10, duration: 400 }}
					out:fade={{ duration: 200 }}
				>
					<span class="mr-2">⚠</span>
					{joinViewModel.error}
				</div>
			{/if}

			<!-- Footer -->
			<p
				class="mt-8 text-center text-xs opacity-30"
				style="color: var(--color-text);"
				in:fade={{ duration: 600, delay: 800 }}
			>
				Made with 🎬 for movie lovers
			</p>
		</div>
	{/if}
</main>

<Snackbar />

<style>
	@keyframes float {
		0%, 100% { transform: translateY(0px); }
		50% { transform: translateY(-20px); }
	}
</style>
