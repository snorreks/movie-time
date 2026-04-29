// src/routes/join/[sessionId]/+page.server.ts
import { getFirestore } from "$lib/server/firebase/database";
import { logger } from "$logger";
import type { PageServerLoad } from "./$types";

/** Loads the session on the server to avoid client-side flash. */
export const load: PageServerLoad = async ({ params }) => {
	const sessionId = params.sessionId;
	logger.debug("[join/+page.server.ts] Loading session with ID:", sessionId);

	const db = getFirestore();
	const sessionSnap = await db.collection("sessions").doc(sessionId).get();

	logger.debug(
		"[join/+page.server.ts] Session snapshot exists:",
		sessionSnap.exists,
	);

	if (!sessionSnap.exists) {
		logger.warn("[join/+page.server.ts] Session not found:", sessionId);
		return {
			sessionId,
			sessionExists: false,
			sessionName: undefined,
		};
	}

	const data = sessionSnap.data();
	const sessionName = data?.["name"] as string | undefined;

	return {
		sessionId,
		sessionExists: true,
		sessionName,
	};
};
