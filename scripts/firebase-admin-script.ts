// packages/backend/configs/src/lib/app.ts
import {
	type AppOptions,
	cert,
	getApps,
	initializeApp,
	type ServiceAccount,
} from "firebase-admin/app";

/**
 * Parses the Firebase service account JSON string and fixes private key newlines.
 */
const parseServiceAccount = (serviceAccountString: string): ServiceAccount => {
	try {
		const parsed = JSON.parse(serviceAccountString) as ServiceAccount;
		if (parsed.privateKey) {
			parsed.privateKey = parsed.privateKey.replace(/\\n/g, "\n");
		}
		return parsed;
	} catch (error) {
		console.error(
			"Invalid FIREBASE_SERVICE_ACCOUNT env:",
			serviceAccountString,
		);
		throw error;
	}
};

/**
 * Builds the configuration options for the Firebase Admin SDK based on the environment.
 */
const buildAppOptions = (): AppOptions => {
	const options: AppOptions = {};

	// --- Production / Live Environment Setup ---
	const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;
	if (!serviceAccountString) {
		throw new Error("FIREBASE_SERVICE_ACCOUNT env not set");
	}

	const projectId = process.env.GCLOUD_PROJECT;

	options.credential = cert(parseServiceAccount(serviceAccountString));

	options.storageBucket = `${projectId}.firebasestorage.app`;
	options.projectId = projectId;

	return options;
};

/**
 * Retrieves an existing Firebase Admin app or initializes a new one.
 */
export const getApp = () => {
	const existingApp = getApps()[0];
	// Early return if we already have a valid app instance
	if (existingApp) {
		return existingApp;
	}

	const options = buildAppOptions();

	const initializedApp = initializeApp(options);

	return initializedApp;
};
