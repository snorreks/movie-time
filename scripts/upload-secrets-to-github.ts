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

	// Upload each secret
	for (const secret of REQUIRED_SECRETS) {
		const value = env[secret];

		if (!value) {
			console.warn(`⚠️  ${secret} not found in ${envFile}, skipping...`);
			continue;
		}

		console.log(`⬆️  Uploading ${secret}...`);
		try {
			await $`echo ${value} | gh secret set ${secret}`;
			console.log(`✅ ${secret} uploaded!`);
		} catch (err) {
			console.error(`❌ Failed to upload ${secret}:`, err);
		}
	}

	// List PUBLIC_ variables that need to go to Vercel dashboard
	const publicVars = VERCEL_PUBLIC_VARS.filter((v) => env[v]);
	if (publicVars.length > 0) {
		console.log(
			"\n⚠️  The following PUBLIC_ variables need to be set in Vercel dashboard:",
		);
		console.log(
			"   Go to: https://vercel.com/<org>/<project>/settings/environment-variables",
		);
		publicVars.forEach((v) => {
			console.log(`   - ${v}`);
		});
	}

	console.log("\n✨ Done! Verify with: gh secret list");
};

main();
