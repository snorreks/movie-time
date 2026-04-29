// src/routes/lounge/[sessionId]/reveal/+page.server.ts
import { error, redirect } from "@sveltejs/kit";
import { getFirestore } from "$lib/server/firebase/database";
import type { Nomination } from "$lib/shared/types/nomination";
import { logger } from "$logger";
import type { PageServerLoad } from "./$types";

/** Loads the session and winner nomination for the Grand Reveal page. */
export const load: PageServerLoad = async ({ params }) => {
	const db = getFirestore();
	const sessionId = params.sessionId;

	logger.debug("[reveal/+page.server.ts] Loading session:", sessionId);

	const sessionSnap = await db.collection("sessions").doc(sessionId).get();

	logger.debug(
		"[reveal/+page.server.ts] Session snapshot exists:",
		sessionSnap.exists,
	);

	if (!sessionSnap.exists) {
		logger.warn("[reveal/+page.server.ts] Session not found:", sessionId);
		throw error(404, "Session not found.");
	}

	const sessionData = sessionSnap.data();

	logger.debug("[reveal/+page.server.ts] Session status:", sessionData?.status);

	// Guard: only accessible once status is "revealed"
	if (sessionData?.status !== "revealed") {
		logger.warn(
			"[reveal/+page.server.ts] Session not revealed yet, redirecting to lounge",
		);
		throw redirect(302, `/lounge/${sessionId}`);
	}

	const winnerNominationId = sessionData?.winnerNominationId as
		| string
		| undefined;

	if (!winnerNominationId) {
		logger.warn("[reveal/+page.server.ts] No winner nomination ID found");
		throw redirect(302, `/lounge/${sessionId}`);
	}

	logger.debug(
		"[reveal/+page.server.ts] Winner nomination ID:",
		winnerNominationId,
	);

	// Get nominations from session document
	const nominations: Nomination[] = sessionData?.nominations || [];

	logger.debug(
		"[reveal/+page.server.ts] Loaded nominations count:",
		nominations.length,
	);

	return { sessionId, winnerNominationId, nominations };
};
