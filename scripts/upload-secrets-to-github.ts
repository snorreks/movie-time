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
	const authCheck = await $`gh auth status`.quiet();
	if (authCheck.exitCode !== 0) {
		console.error("❌ GitHub CLI not authenticated. Run: gh auth login");
		process.exit(1);
	}

	// Check if Vercel CLI is available
	const vercelCheck = await $`bunx vercel --version`.quiet();
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
	if (!vercelToken) {
		console.warn(`⚠️  VERCEL_TOKEN not found, skipping Vercel env vars...`);
	} else {
		console.log("\n🚀 Uploading PUBLIC_ variables to Vercel...\n");

		for (const varName of VERCEL_PUBLIC_VARS) {
			const value = env[varName];

			if (!value) {
				console.warn(`⚠️  ${varName} not found in ${envFile}, skipping...`);
				continue;
			}

			console.log(`⬆️  Uploading ${varName} to Vercel...`);
			try {
				// Add to all environments: production, preview, development
				await $`echo ${value} | bunx vercel env add ${varName} production --yes --token=${vercelToken}`;
				await $`echo ${value} | bunx vercel env add ${varName} preview --yes --token=${vercelToken}`;
				await $`echo ${value} | bunx vercel env add ${varName} development --yes --token=${vercelToken}`;
				console.log(`✅ ${varName} uploaded to Vercel!`);
			} catch (err) {
				console.error(`❌ Failed to upload ${varName} to Vercel:`, err);
			}
		}
	}

	console.log("\n✨ Done! Verify with: gh secret list && vercel env ls");
};

main();
