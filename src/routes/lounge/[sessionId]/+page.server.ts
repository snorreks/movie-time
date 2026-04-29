// src/routes/lounge/[sessionId]/+page.server.ts
import { error, fail } from "@sveltejs/kit";
import { getFirestore } from "$lib/server/firebase/database";
import type { Nomination } from "$lib/shared/types/nomination";
import { logger } from "$logger";
import type { Actions, PageServerLoad } from "./$types";

/** Loads the session to validate it exists before rendering the lounge. */
export const load: PageServerLoad = async ({ params }) => {
	const sessionId = params.sessionId;
	logger.debug("[+page.server.ts] Loading session with ID:", sessionId);
	const db = getFirestore();
	const sessionSnap = await db.collection("sessions").doc(sessionId).get();

	logger.debug(
		"[+page.server.ts] Session snapshot exists:",
		sessionSnap.exists,
	);

	if (!sessionSnap.exists) {
		logger.warn("[+page.server.ts] Session not found:", sessionId);
		throw error(404, "Session not found.");
	}

	return { sessionId };
};

// ---------------------------------------------------------------------------
// Server actions
// ---------------------------------------------------------------------------

/**
 * Computes a weighted-random winner from non-vetoed nominations and writes
 * the result to the session document, transitioning it to "revealed".
 */
const selectWeightedWinner = (nominations: Nomination[]): Nomination => {
	// Each nomination has a baseline weight of 1 plus its vote count
	const weights = nominations.map((n) => 1 + n.votes);
	const totalWeight = weights.reduce((sum, w) => sum + w, 0);
	let random = Math.random() * totalWeight;

	for (let i = 0; i < nominations.length; i++) {
		random -= weights[i];
		if (random <= 0) {
			return nominations[i];
		}
	}
	return nominations[nominations.length - 1];
};

export const actions: Actions = {
	startReveal: async ({ params }) => {
		const db = getFirestore();
		const sessionId = params.sessionId;

		// Fetch non-vetoed nominations
		const nominationsSnap = await db
			.collection("nominations")
			.where("sessionId", "==", sessionId)
			.where("vetoed", "==", false)
			.get();

		if (nominationsSnap.empty) {
			return fail(400, { message: "No eligible nominations to reveal." });
		}

		const nominations: Nomination[] = nominationsSnap.docs.map((d) => ({
			id: d.id,
			...(d.data() as Omit<Nomination, "id">),
		}));

		const winner = selectWeightedWinner(nominations);

		// Write winner atomically and flip status to "revealed"
		await db.collection("sessions").doc(sessionId).update({
			winnerNominationId: winner.id,
			status: "revealed",
		});

		return { success: true, winnerId: winner.id };
	},
};
