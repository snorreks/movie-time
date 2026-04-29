// scripts/setup-admin-user.ts
import { initializeApp as initAdmin } from "firebase-admin/app";
import { createUser, getAuth, setCustomUserClaims } from "firebase-admin/auth";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@directors-lounge.dev";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123!";

const setupAdmin = async () => {
	try {
		// Initialize Firebase Admin
		const app = initAdmin({
			projectId: "demo-directors-lounge",
		});

		const auth = getAuth(app);

		// Check if user already exists
		try {
			const existingUser = await auth.getUserByEmail(ADMIN_EMAIL);
			console.log(`✅ Admin user already exists: ${ADMIN_EMAIL}`);
			console.log(`   UID: ${existingUser.uid}`);
			process.exit(0);
		} catch (_error) {
			// User doesn't exist, continue to create
		}

		// Create admin user
		const user = await createUser(auth, {
			email: ADMIN_EMAIL,
			password: ADMIN_PASSWORD,
			emailVerified: true,
		});

		// Set custom claims to mark as admin
		await setCustomUserClaims(auth, user.uid, { admin: true });

		console.log(`✅ Admin user created successfully!`);
		console.log(`   Email: ${ADMIN_EMAIL}`);
		console.log(`   Password: ${ADMIN_PASSWORD}`);
		console.log(`   UID: ${user.uid}`);
		console.log(`\nUse these credentials to log in as admin.`);
		process.exit(0);
	} catch (_error) {
		console.error("❌ Failed to create admin user:", _error);
		process.exit(1);
	}
};

setupAdmin();
