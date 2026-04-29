// biome-ignore-all lint/style/useNamingConvention: Firebase App Check debug token global
// packages/frontend/services/src/lib/firebase/configs/app.ts
import { type FirebaseOptions, getApps, initializeApp } from "firebase/app";
import { logger } from "$logger";

const getApp = () => {
	const app = getApps()[0];
	if (app) {
		return app;
	}

	const isEmulator = import.meta.env.PUBLIC_FLAVOR === "emulator";
	const projectId = import.meta.env.PUBLIC_FIREBASE_PROJECT_ID;

	const serviceAccount: FirebaseOptions = isEmulator
		? {
				apiKey: "demo-key",
				authDomain: "localhost",
				projectId,
				storageBucket: `${projectId}.firebasestorage.app`,
				messagingSenderId: "000000000000",
				appId: "demo-app-id",
				measurementId: "test-measurement-id",
			}
		: {
				apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
				authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
				projectId,
				storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
				messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
				appId: import.meta.env.PUBLIC_FIREBASE_APP_ID,
			};

	if (!serviceAccount.apiKey) {
		throw new Error(
			"Firebase configuration is missing. Please set the required environment variables like `PUBLIC_FIREBASE_API_KEY`.",
		);
	}
	// TODO: change to debug
	logger.info("serviceAccount", serviceAccount);
	const initializedApp = initializeApp(serviceAccount);
	logger.info("- app initialized", initializedApp);
	return initializedApp;
};

// https://gist.github.com/dyaa/8f8d1f8964160630f2475fe26a2e6150
const app = getApp();

export default app;
