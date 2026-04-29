// scripts/upload-secrets-to-github.ts

import { readFileSync } from "node:fs";
import { $ } from "bun";

const REQUIRED_SECRETS = [
	"VERCEL_TOKEN",
	"VERCEL_ORG_ID",
	"VERCEL_PROJECT_ID",
	"TMDB_API_KEY",
	"TMDB_API_READ_ACCESS_TOKEN",
	"GEMINI_API_KEY",
	"OPENROUTER_API_KEY",
	"FIREBASE_SERVICE_ACCOUNT",
	"GCLOUD_PROJECT",
];

// PUBLIC_ variables go to Vercel dashboard, not GitHub secrets
const VERCEL_PUBLIC_VARS = [
	"PUBLIC_FIREBASE_API_KEY",
	"PUBLIC_FIREBASE_AUTH_DOMAIN",
	"PUBLIC_FIREBASE_PROJECT_ID",
	"PUBLIC_FIREBASE_STORAGE_BUCKET",
	"PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
	"PUBLIC_FIREBASE_APP_ID",
	"PUBLIC_LOG_LEVEL",
	"PUBLIC_FLAVOR",
];

const loadEnvFile = (filepath: string): Record<string, string> => {
	const content = readFileSync(filepath, "utf-8");
	const env: Record<string, string> = {};

	content.split("\n").forEach((line) => {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) return;

		const [name, ...rest] = trimmed.split("=");
		if (name && rest.length > 0) {
			env[name.trim()] = rest.join("=").trim();
		}
	});

	return env;
};

const main = async () => {
	console.log("🔑 Uploading secrets to GitHub...\n");

	// Check if gh CLI is authenticated
	const authCheck = await $`gh auth status`.quiet().nothrow();
	if (authCheck.exitCode !== 0) {
		console.error("❌ GitHub CLI not authenticated. Run: gh auth login");
		process.exit(1);
	}

	// Check if Vercel CLI is available
	const vercelCheck = await $`bunx vercel --version`.quiet().nothrow();
	if (vercelCheck.exitCode !== 0) {
		console.error("❌ Vercel CLI not found. Run: bun add -d vercel@latest");
		process.exit(1);
	}

	// Load .env file
	const envFile = process.argv[2] || ".env";
	const envPath = `${process.cwd()}/${envFile}`;
	let env: Record<string, string>;

	try {
		env = loadEnvFile(envPath);
		console.log(`📄 Loaded ${envFile}`);
	} catch (err) {
		console.error(`❌ Could not read ${envFile}:`, err);
		process.exit(1);
	}

	// Upload GitHub secrets
	for (const secret of REQUIRED_SECRETS) {
		const value = env[secret];

		if (!value) {
			console.warn(`⚠️  ${secret} not found in ${envFile}, skipping...`);
			continue;
		}

		console.log(`⬆️  Uploading ${secret} to GitHub...`);
		try {
			await $`echo ${value} | gh secret set ${secret}`;
			console.log(`✅ ${secret} uploaded to GitHub!`);
		} catch (err) {
			console.error(`❌ Failed to upload ${secret}:`, err);
		}
	}

	// Upload PUBLIC_ variables to Vercel
	const vercelToken = env["VERCEL_TOKEN"];
	const vercelProjectId = env["VERCEL_PROJECT_ID"];
	const vercelOrgId = env["VERCEL_ORG_ID"];

	if (!vercelToken || !vercelProjectId) {
		console.warn(
			`⚠️  VERCEL_TOKEN or VERCEL_PROJECT_ID not found, skipping Vercel env vars...`,
		);
	} else {
		console.log("\n🚀 Uploading PUBLIC_ variables to Vercel...\n");

		// Explicitly package the Vercel context to pass into Bun's shell
		const vercelContext = {
			VERCEL_PROJECT_ID: vercelProjectId,
			VERCEL_ORG_ID: vercelOrgId || "",
		};

		for (const varName of VERCEL_PUBLIC_VARS) {
			const value = env[varName];

			if (!value) {
				console.warn(`⚠️  ${varName} not found in ${envFile}, skipping...`);
				continue;
			}

			console.log(`🧹 Deleting existing ${varName} from Vercel...`);

			// STEP 1: Explicitly DELETE from each environment using `env rm`
			await $`bunx vercel env rm ${varName} production --yes --token=${vercelToken}`
				.env(vercelContext)
				.nothrow();
			await $`bunx vercel env rm ${varName} preview --yes --token=${vercelToken}`
				.env(vercelContext)
				.nothrow();
			await $`bunx vercel env rm ${varName} development --yes --token=${vercelToken}`
				.env(vercelContext)
				.nothrow();

			console.log(`⬆️  Uploading ${varName} to Vercel...`);
			try {
				// STEP 2: ADD to all environments using `env add`
				// Note the "" added to preview to bypass the git branch prompt!
				await $`echo ${value} | bunx vercel env add ${varName} production --yes --token=${vercelToken}`
					.env(vercelContext)
					.quiet();
				await $`echo ${value} | bunx vercel env add ${varName} preview "" --yes --token=${vercelToken}`
					.env(vercelContext)
					.quiet();
				await $`echo ${value} | bunx vercel env add ${varName} development --yes --token=${vercelToken}`
					.env(vercelContext)
					.quiet();

				console.log(`✅ ${varName} uploaded to Vercel!`);
			} catch (err) {
				console.error(`❌ Failed to upload ${varName} to Vercel:`, err);
			}
		}
	}

	console.log(
		"\n✨ Done! Trigger a redeployment in Vercel for the changes to take effect.",
	);
};

main();
