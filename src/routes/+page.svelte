<script lang="ts">
// src/routes/+page.svelte
import { fade, fly } from "svelte/transition";
import { snackbarService } from "$lib/client/services/snackbar.svelte";
import Snackbar from "$lib/components/Snackbar.svelte";
import { entryHallViewModel } from "$lib/viewmodels/entry-hall.viewmodel.svelte";

let showContent = $state(false);

$effect(() => {
	entryHallViewModel.initialize();
	setTimeout(() => (showContent = true), 100);
});
</script>

<svelte:head>
	<title>The Director's Lounge — Movie Night Redefined</title>
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

	<div
		class="pointer-events-none absolute right-10 top-20 h-64 w-64 rounded-full opacity-20 blur-3xl"
		style="background: radial-gradient(circle, #6366f1 0%, transparent 70%);"
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
				<!-- Animated icon -->
				<div
					class="mb-6 inline-flex items-center justify-center"
					in:fly={{ y: -20, duration: 600, delay: 300 }}
				>
					<span class="text-6xl" style="animation: spin 20s linear infinite;">🎬</span>
				</div>

				<h1
					class="mb-3 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text text-5xl font-bold tracking-tight text-transparent"
					style="font-family: var(--font-display); line-height: 1.2;"
				>
					The Director's
					<br />
					<span class="text-6xl">Lounge</span>
				</h1>

				<p
					class="mx-auto max-w-xs text-sm font-light leading-relaxed opacity-60"
					style="color: var(--color-text);"
					in:fly={{ y: 20, duration: 600, delay: 500 }}
				>
					Your cinematic movie night starts here
					<span class="inline-block animate-pulse">🍿</span>
				</p>
			</div>

			<!-- Main Card with Glassmorphism -->
			<div
				class="group relative overflow-hidden rounded-3xl border p-8 shadow-2xl"
				style="background: rgba(255, 255, 255, 0.05);
					backdrop-filter: blur(20px);
					border-color: rgba(212, 175, 55, 0.2);"
				in:fly={{ y: 40, duration: 800, delay: 400 }}
			>
				<!-- Glass reflection effect -->
				<div
					class="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
					style="background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%);"
				></div>

				<!-- Admin Mode Toggle -->
				<button
					type="button"
					onclick={entryHallViewModel.toggleAdminMode}
					class="mb-4 w-full rounded-lg border px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-all"
					style="color: var(--color-text); border-color: var(--color-border); opacity: 0.6;"
				>
					{entryHallViewModel.isAdminMode ? '← Back to Guest Mode' : '🔑 Admin Login'}
				</button>

				{#if entryHallViewModel.isAdminMode}
					<!-- Admin Login -->
					<div class="mb-6 space-y-4">
						<div>
							<label
								for="admin-email"
								class="mb-2 block text-xs font-semibold uppercase tracking-widest opacity-60"
								style="color: var(--color-text);"
							>
								Admin Email
							</label>
							<input
								id="admin-email"
								type="email"
								placeholder="admin@directors-lounge.dev"
								value={entryHallViewModel.adminEmail}
								oninput={(e) => entryHallViewModel.setAdminEmail((e.currentTarget as HTMLInputElement).value)}
								class="w-full rounded-xl border bg-transparent py-4 pl-4 pr-4 text-sm outline-none transition-all placeholder:opacity-40 focus:ring-2 focus:ring-offset-2"
								style="color: var(--color-text);
									border-color: rgba(255,255,255,0.15);
									--tw-ring-color: var(--color-primary);
									--tw-ring-offset-color: transparent;"
							/>
						</div>
						<div>
							<label
								for="admin-password"
								class="mb-2 block text-xs font-semibold uppercase tracking-widest opacity-60"
								style="color: var(--color-text);"
							>
								Password
							</label>
							<input
								id="admin-password"
								type="password"
								placeholder="Enter password"
								value={entryHallViewModel.adminPassword}
								oninput={(e) => entryHallViewModel.setAdminPassword((e.currentTarget as HTMLInputElement).value)}
								class="w-full rounded-xl border bg-transparent py-4 pl-4 pr-4 text-sm outline-none transition-all placeholder:opacity-40 focus:ring-2 focus:ring-offset-2"
								style="color: var(--color-text);
									border-color: rgba(255,255,255,0.15);
									--tw-ring-color: var(--color-primary);
									--tw-ring-offset-color: transparent;"
							/>
						</div>
					</div>
				{/if}

				<!-- Name input -->
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
							value={entryHallViewModel.username}
							oninput={(e) => entryHallViewModel.setUsername((e.currentTarget as HTMLInputElement).value)}
							class="w-full rounded-xl border bg-transparent py-4 pl-12 pr-4 text-sm outline-none transition-all placeholder:opacity-40 focus:ring-2 focus:ring-offset-2"
							style="color: var(--color-text);
								border-color: rgba(255,255,255,0.15);
								--tw-ring-color: var(--color-primary);
								--tw-ring-offset-color: transparent;"
						/>
					</div>
				</div>

				<!-- Session Name (optional) -->
				{#if entryHallViewModel.isAdminMode}
					<div class="mb-6">
						<label
							for="session-name"
							class="mb-2 block text-xs font-semibold uppercase tracking-widest opacity-60"
							style="color: var(--color-text);"
						>
							Session Name (optional)
						</label>
						<input
							id="session-name"
							type="text"
							placeholder="e.g. Friday Night Movies"
							maxlength="50"
							value={entryHallViewModel.sessionName}
							oninput={(e) => entryHallViewModel.setSessionName((e.currentTarget as HTMLInputElement).value)}
							class="w-full rounded-xl border bg-transparent py-4 pl-4 pr-4 text-sm outline-none transition-all placeholder:opacity-40 focus:ring-2 focus:ring-offset-2"
							style="color: var(--color-text);
								border-color: rgba(255,255,255,0.15);
								--tw-ring-color: var(--color-primary);
								--tw-ring-offset-color: transparent;"
						/>
					</div>
				{/if}

				<!-- Create session button -->
				<button
					type="button"
					onclick={entryHallViewModel.isAdminMode ? entryHallViewModel.adminLogin : entryHallViewModel.createSession}
					disabled={entryHallViewModel.isLoading}
					class="group relative mb-6 w-full overflow-hidden rounded-xl px-6 py-4 text-base font-bold transition-all duration-300
						hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
					style="background: linear-gradient(135deg, #D4AF37 0%, #F5E6A3 50%, #D4AF37 100%);
						color: #08080A;
						box-shadow: 0 4px 20px rgba(212, 175, 55, 0.4);"
					in:fly={{ y: 20, duration: 600, delay: 600 }}
				>
					<!-- Shimmer effect -->
					<div
						class="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full"
					></div>
					{#if entryHallViewModel.isLoading}
						<span class="inline-block animate-spin">⏳</span>
					{:else}
						🎥 {entryHallViewModel.isAdminMode ? 'Login & Start Lounge' : 'Start a New Lounge'}
					{/if}
				</button>

				<!-- Divider -->
				<div class="relative mb-6 flex items-center gap-4">
					<div class="h-px flex-1" style="background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1));"></div>
					<span class="text-xs font-semibold uppercase tracking-widest opacity-40" style="color: var(--color-text);">
						or join one
					</span>
					<div class="h-px flex-1" style="background: linear-gradient(270deg, transparent, rgba(255,255,255,0.1));"></div>
				</div>

				<!-- Session ID input -->
				<div class="mb-6">
					<label
						for="session-id"
						class="mb-2 block text-xs font-semibold uppercase tracking-widest opacity-60"
						style="color: var(--color-text);"
					>
						Session ID
					</label>
					<div class="relative">
						<span class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg opacity-40">
							🔑
						</span>
						<input
							id="session-id"
							type="text"
							placeholder="Paste your session ID"
							value={entryHallViewModel.sessionIdInput}
							oninput={(e) =>
								entryHallViewModel.setSessionIdInput((e.currentTarget as HTMLInputElement).value)}
							class="w-full rounded-xl border bg-transparent py-4 pl-12 pr-4 text-sm outline-none transition-all placeholder:opacity-40 focus:ring-2 focus:ring-offset-2"
							style="color: var(--color-text);
								border-color: rgba(255,255,255,0.15);
								--tw-ring-color: var(--color-primary);
								--tw-ring-offset-color: transparent;"
						/>
					</div>
				</div>

				<!-- Join button -->
				<button
					type="button"
					onclick={entryHallViewModel.joinSession}
					disabled={entryHallViewModel.isLoading}
					class="group relative w-full overflow-hidden rounded-xl border px-6 py-4 text-base font-bold transition-all duration-300
						hover:bg-white/5 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
					style="color: var(--color-primary);
						border-color: rgba(212, 175, 55, 0.3);"
					in:fly={{ y: 20, duration: 600, delay: 700 }}
				>
					<!-- Glow effect -->
					<div
						class="pointer-events-none absolute inset-0 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100"
						style="background: rgba(212, 175, 55, 0.15);"
					></div>
					{#if entryHallViewModel.isLoading}
						<span class="inline-block animate-spin">⏳</span>
					{:else}
						🚪 Join Lounge
					{/if}
				</button>

				<!-- Error message -->
				{#if entryHallViewModel.error}
					<div
						class="mt-6 rounded-xl border p-4 text-sm"
						style="background: rgba(200, 35, 51, 0.15);
							border-color: rgba(200, 35, 51, 0.3);
							color: var(--color-accent);"
						in:fly={{ y: 10, duration: 400 }}
						out:fade={{ duration: 200 }}
					>
						<span class="mr-2">⚠</span>
						{entryHallViewModel.error}
					</div>
				{/if}
			</div>

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
	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
</style>

