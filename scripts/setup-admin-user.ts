// scripts/setup-admin-user.ts
import { getAuth } from "firebase-admin/auth";
import { getApp } from "./firebase-admin-script";

import * as readline from "node:readline";

const prompt = (message: string): Promise<string> =>
	new Promise((resolve) => {
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});
		rl.question(message, (answer) => {
			rl.close();
			resolve(answer.trim());
		});
	});

const parseArgs = () => {
	const args = process.argv.slice(2);
	const result: { email?: string; password?: string } = {};

	for (let i = 0; i < args.length; i++) {
		if (args[i] === "--email" && args[i + 1]) {
			result.email = args[i + 1];
			i++;
		} else if (args[i] === "--password" && args[i + 1]) {
			result.password = args[i + 1];
			i++;
		}
	}

	return result;
};

const setupAdmin = async () => {
	try {
		const args = parseArgs();

		const ADMIN_EMAIL = args.email || process.env.ADMIN_EMAIL || await prompt("Enter admin email: ");
		let ADMIN_PASSWORD = args.password || process.env.ADMIN_PASSWORD;

		if (!ADMIN_PASSWORD) {
			ADMIN_PASSWORD = await prompt("Enter admin password: ");
			if (!ADMIN_PASSWORD) {
				console.error("❌ Password cannot be empty");
				process.exit(1);
			}
		}

		if (!ADMIN_EMAIL) {
			console.error("❌ Email cannot be empty");
			process.exit(1);
		}

		const auth = getAuth(getApp());

		try {
			const existingUser = await auth.getUserByEmail(ADMIN_EMAIL);
			console.log(`✅ Admin user already exists: ${ADMIN_EMAIL}`);
			console.log(`   UID: ${existingUser.uid}`);
			process.exit(0);
		} catch (_error) {
			// User doesn't exist, continue to create
		}

		const user = await auth.createUser({
			email: ADMIN_EMAIL,
			password: ADMIN_PASSWORD,
			emailVerified: true,
		});

		await auth.setCustomUserClaims(user.uid, { admin: true });

		console.log(`✅ Admin user created successfully!`);
		console.log(`   Email: ${ADMIN_EMAIL}`);
		console.log(`   UID: ${user.uid}`);
		console.log(`\nUse these credentials to log in as admin.`);
		process.exit(0);
	} catch (_error) {
		console.error("❌ Failed to create admin user:", _error);
		process.exit(1);
	}
};

setupAdmin();
