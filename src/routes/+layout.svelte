<script lang="ts">
	import "./layout.css";
	import favicon from "$lib/assets/favicon.svg";

	let { children } = $props();
</script>

<svelte:head>
	<!-- Favicons -->
	<link rel="icon" href={favicon} type="image/svg+xml" />
	<link rel="icon" href="/favicon-16.png" sizes="16x16" type="image/png" />
	<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png" />
	<link rel="icon" href="/favicon-48.png" sizes="48x48" type="image/png" />
	<link rel="icon" href="/favicon-64.png" sizes="64x64" type="image/png" />
	<link rel="apple-touch-icon" href="/favicon-192.png" />
	<link rel="shortcut icon" href="/favicon-32.png" type="image/png" />

	<!-- Primary Meta Tags -->
	<meta name="title" content="The Director's Lounge — Movie Night Reimagined" />
	<meta name="description" content="Create or join a movie night lounge, nominate films, vote with golden tickets, and let the AI Concierge pick the perfect watch. Built for movie lovers." />

	<!-- Open Graph / Facebook -->
	<meta property="og:type" content="website" />
	<meta property="og:title" content="The Director's Lounge" />
	<meta property="og:description" content="Create or join a movie night lounge, nominate films, vote with golden tickets, and let the AI Concierge pick the perfect watch." />
	<meta property="og:image" content="https://your-domain.com/favicon-192.png" />

	<!-- Twitter -->
	<meta property="twitter:card" content="summary_large_image" />
	<meta property="twitter:title" content="The Director's Lounge" />
	<meta property="twitter:description" content="Create or join a movie night lounge, nominate films, vote with golden tickets, and let the AI Concierge pick the perfect watch." />
	<meta property="twitter:image" content="https://your-domain.com/favicon-192.png" />
</svelte:head>
{@render children()}
