<script lang="ts">
// src/routes/+page.svelte

import { fade, fly } from "svelte/transition";
import { goto } from "$app/navigation";
import { snackbarService } from "$lib/client/services/snackbar.svelte";
import Snackbar from "$lib/components/Snackbar.svelte";
import { adminViewModel } from "$lib/viewmodels/admin.viewmodel.svelte";

const handleUpdateUsername = async () => {
	await adminViewModel.updateUsername();
	if (adminViewModel.error === undefined) {
		snackbarService.success("Username updated!");
	}
};

let showContent = $state(false);

$effect(() => {
	adminViewModel.initialize();
	setTimeout(() => (showContent = true), 100);
});

const handleLogin = async () => {
	await adminViewModel.login();
};

const handleCreateSession = async () => {
	await adminViewModel.createSession();
	if (adminViewModel.createdSessionId) {
		snackbarService.success("Session created! Share the link below.");
	}
};

const copyLink = () => {
	const url = `${window.location.origin}/lounge/${adminViewModel.createdSessionId}`;
	navigator.clipboard.writeText(url);
	snackbarService.success("Link copied to clipboard!");
};
</script>

	<svelte:head>
		<title>The Director's Lounge — Create Movie Night Sessions</title>
		<meta name="description" content="Create or join a movie night lounge, nominate films, vote with golden tickets, and let the AI Concierge pick the perfect watch. Built for movie lovers." />
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
					Admin Panel
					<span class="inline-block animate-pulse">🔑</span>
				</p>
			</div>

			{#if !adminViewModel.isLoggedIn}
				<!-- Login Card -->
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
						Admin Login
					</h2>

					<div class="mb-4">
						<label
							for="admin-email"
							class="mb-2 block text-xs font-semibold uppercase tracking-widest opacity-60"
							style="color: var(--color-text);"
						>
							Email
						</label>
						<input
							id="admin-email"
							type="email"
							placeholder="admin@directors-lounge.dev"
							value={adminViewModel.adminEmail}
							oninput={(e) => adminViewModel.setAdminEmail((e.currentTarget as HTMLInputElement).value)}
							class="w-full rounded-xl border bg-transparent py-4 pl-4 pr-4 text-sm outline-none transition-all placeholder:opacity-40 focus:ring-2 focus:ring-offset-2"
							style="color: var(--color-text);
								border-color: rgba(255,255,255,0.15);
								--tw-ring-color: var(--color-primary);
								--tw-ring-offset-color: transparent;"
						/>
					</div>

					<div class="mb-6">
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
							value={adminViewModel.adminPassword}
							oninput={(e) => adminViewModel.setAdminPassword((e.currentTarget as HTMLInputElement).value)}
							onkeydown={(e) => {
								if (e.key === 'Enter') handleLogin();
							}}
							class="w-full rounded-xl border bg-transparent py-4 pl-4 pr-4 text-sm outline-none transition-all placeholder:opacity-40 focus:ring-2 focus:ring-offset-2"
							style="color: var(--color-text);
								border-color: rgba(255,255,255,0.15);
								--tw-ring-color: var(--color-primary);
								--tw-ring-offset-color: transparent;"
						/>
					</div>

					<button
						type="button"
						onclick={handleLogin}
						disabled={adminViewModel.isLoading}
						class="group relative mb-6 w-full overflow-hidden rounded-xl px-6 py-4 text-base font-bold transition-all duration-300
							hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
						style="background: linear-gradient(135deg, #D4AF37 0%, #F5E6A3 50%, #D4AF37 100%);
							color: #08080A;
							box-shadow: 0 4px 20px rgba(212, 175, 55, 0.4);"
					>
						<div
							class="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full"
						></div>
						{#if adminViewModel.isLoading}
							<span class="inline-block animate-spin">⏳</span>
						{:else}
							🔑 Sign In
						{/if}
					</button>
				</div>
			{:else}
				<!-- Username Editing Card -->
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
						Admin Profile
					</h2>

					{#if adminViewModel.currentUsername}
						<p class="mb-4 text-center text-sm opacity-60" style="color: var(--color-text);">
							Current username: <span class="font-semibold" style="color: var(--color-primary);">{adminViewModel.currentUsername}</span>
						</p>
					{/if}

					<div class="mb-6">
						<label
							for="admin-username"
							class="mb-2 block text-xs font-semibold uppercase tracking-widest opacity-60"
							style="color: var(--color-text);"
						>
							New Username
						</label>
						<input
							id="admin-username"
							type="text"
							placeholder="Enter new username"
							value={adminViewModel.adminUsername}
							oninput={(e) => adminViewModel.setAdminUsername((e.currentTarget as HTMLInputElement).value)}
							onkeydown={(e) => {
								if (e.key === 'Enter') handleUpdateUsername();
							}}
							class="w-full rounded-xl border bg-transparent py-4 pl-4 pr-4 text-sm outline-none transition-all placeholder:opacity-40 focus:ring-2 focus:ring-offset-2"
							style="color: var(--color-text);
								border-color: rgba(255,255,255,0.15);
								--tw-ring-color: var(--color-primary);
								--tw-ring-offset-color: transparent;"
						/>
					</div>

					<button
						type="button"
						onclick={handleUpdateUsername}
						disabled={adminViewModel.isLoading}
						class="group relative mb-6 w-full overflow-hidden rounded-xl px-6 py-4 text-base font-bold transition-all duration-300
							hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
						style="background: linear-gradient(135deg, #D4AF37 0%, #F5E6A3 50%, #D4AF37 100%);
							color: #08080A;
							box-shadow: 0 4px 20px rgba(212, 175, 55, 0.4);"
					>
						<div
							class="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full"
						></div>
						{#if adminViewModel.isLoading}
							<span class="inline-block animate-spin">⏳</span>
						{:else}
							✏️ Update Username
						{/if}
					</button>
				</div>

				<!-- Session Creation Card -->
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
						Create New Session
					</h2>

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
							value={adminViewModel.sessionName}
							oninput={(e) => adminViewModel.setSessionName((e.currentTarget as HTMLInputElement).value)}
							class="w-full rounded-xl border bg-transparent py-4 pl-4 pr-4 text-sm outline-none transition-all placeholder:opacity-40 focus:ring-2 focus:ring-offset-2"
							style="color: var(--color-text);
								border-color: rgba(255,255,255,0.15);
								--tw-ring-color: var(--color-primary);
								--tw-ring-offset-color: transparent;"
						/>
					</div>

					<button
						type="button"
						onclick={handleCreateSession}
						disabled={adminViewModel.isLoading}
						class="group relative mb-6 w-full overflow-hidden rounded-xl px-6 py-4 text-base font-bold transition-all duration-300
							hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
						style="background: linear-gradient(135deg, #D4AF37 0%, #F5E6A3 50%, #D4AF37 100%);
							color: #08080A;
							box-shadow: 0 4px 20px rgba(212, 175, 55, 0.4);"
					>
						<div
							class="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full"
						></div>
						{#if adminViewModel.isLoading}
							<span class="inline-block animate-spin">⏳</span>
						{:else}
							🎥 Create Lounge
						{/if}
					</button>

					{#if adminViewModel.createdSessionId}
						<div
							class="mt-6 rounded-xl border p-4"
							style="background: rgba(212, 175, 55, 0.1); border-color: rgba(212, 175, 55, 0.3);"
						>
							<p class="mb-2 text-xs font-semibold uppercase tracking-widest opacity-60" style="color: var(--color-text);">
								Share this link:
							</p>
							<div class="flex items-center gap-2">
								<code class="flex-1 rounded-lg bg-black/30 px-3 py-2 text-xs break-all" style="color: var(--color-primary);">
									{window.location.origin}/join/{adminViewModel.createdSessionId}
								</code>
								<button
									type="button"
									onclick={copyLink}
									class="rounded-lg px-4 py-2 text-xs font-semibold transition-all hover:brightness-110"
									style="background-color: var(--color-primary); color: var(--color-bg);"
								>
									Copy
								</button>
							</div>
						</div>
					{/if}
				</div>
			{/if}

			{#if adminViewModel.error}
				<div
					class="mt-6 rounded-xl border p-4 text-sm"
					style="background: rgba(200, 35, 51, 0.15);
						border-color: rgba(200, 35, 51, 0.3);
						color: var(--color-accent);"
					in:fly={{ y: 10, duration: 400 }}
					out:fade={{ duration: 200 }}
				>
					<span class="mr-2">⚠</span>
					{adminViewModel.error}
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
	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
</style>
