<script lang="ts">
import "./layout.css";

let { children } = $props();
</script>

<svelte:head>
	<!-- Favicons -->
	<link rel="icon" href="/favicon.ico" type="image/x-icon" />
	<link rel="icon" href="/favicon-16x16.png" sizes="16x16" type="image/png" />
	<link rel="icon" href="/favicon-32x32.png" sizes="32x32" type="image/png" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
	<link rel="shortcut icon" href="/favicon-32x32.png" type="image/png" />

	<!-- Primary Meta Tags -->
	<meta name="title" content="The Director's Lounge — Movie Night Reimagined" />
	<meta name="description" content="Create or join a movie night lounge, nominate films, vote with golden tickets, and let the AI Concierge pick the perfect watch. Built for movie lovers." />

	<!-- Open Graph / Facebook -->
	<meta property="og:type" content="website" />
	<meta property="og:title" content="The Director's Lounge" />
	<meta property="og:description" content="Create or join a movie night lounge, nominate films, vote with golden tickets, and let the AI Concierge pick the perfect watch." />
	<meta property="og:image" content="/android-chrome-192x192.png" />

	<!-- Twitter -->
	<meta property="twitter:card" content="summary_large_image" />
	<meta property="twitter:title" content="The Director's Lounge" />
	<meta property="twitter:description" content="Create or join a movie night lounge, nominate films, vote with golden tickets, and let the AI Concierge pick the perfect watch." />
	<meta property="twitter:image" content="/android-chrome-192x192.png" />
</svelte:head>
{@render children()}
