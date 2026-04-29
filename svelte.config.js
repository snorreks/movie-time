import adapter from "@sveltejs/adapter-vercel";

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// compilerOptions: {
	// 	// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
	// 	runes: ({ filename }) =>
	// 		filename.split(/[/\\]/).includes("node_modules") ? undefined : true,
	// },
	kit: {
		// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
		// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
		// See https://svelte.dev/docs/kit/adapters for more information about adapters.
		adapter: adapter(),
		alias: {
			"$components/*": "src/lib/components/*",
			$i18n: "src/lib/client/utils/i18n",
			$lib: "src/lib",
			"$lib/*": "src/lib/*",
			$logger: "src/lib/shared/logger",
			$types: "src/lib/shared/types/index.ts",
			$utils: "src/lib/utils",
			"$utils/*": "src/lib/utils/*",
			"$views/*": "src/lib/views/*",
		},
	},
};

export default config;
