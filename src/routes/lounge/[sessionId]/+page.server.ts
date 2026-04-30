// src/routes/lounge/[sessionId]/+page.server.ts
import { error } from "@sveltejs/kit";
import { getFirestore } from "$lib/server/firebase/database";
import { logger } from "$logger";
import type { Session, SessionUser } from "$types";
import type { PageServerLoad } from "./$types";

/**
 * Loads the full session document server-side and resolves whether the
 * requesting user (identified via the session cookie in `locals.uid`) is
 * already a member of the session.
 *
 * Returns:
 * - `session`     – the full session document (nominations, users, etc.)
 * - `sessionUser` – the matching SessionUser entry, or null if not joined yet
 */
export const load: PageServerLoad = async ({ params, locals }) => {
	const sessionId = params.sessionId;
	const uid = locals.uid;

	logger.debug("[lounge/+page.server] Loading session:", sessionId, "uid:", uid ?? "unauthenticated");

	const db = getFirestore();
	const snap = await db.collection("sessions").doc(sessionId).get();

	if (!snap.exists) {
		logger.warn("[lounge/+page.server] Session not found:", sessionId);
		throw error(404, "Session not found.");
	}

	const raw = snap.data() as Omit<Session, "id"> & { createdAt?: unknown };

	// Firestore Timestamps are not serialisable — convert to ISO strings.
	const session: Session = {
		...(raw as Session),
		id: snap.id,
		createdAt: raw.createdAt && typeof (raw.createdAt as { toDate?: () => Date }).toDate === "function"
			? ((raw.createdAt as { toDate: () => Date }).toDate().toISOString() as unknown as typeof raw.createdAt)
			: raw.createdAt,
	};

	const sessionUser: SessionUser | null =
		uid ? (session.users?.find((u) => u.uid === uid) ?? null) : null;

	logger.info(
		"[lounge/+page.server] Loaded session:", sessionId,
		"status:", session.status,
		"uid:", uid ?? "none",
		"isJoined:", sessionUser !== null,
	);

	return {
		session,
		sessionUser,
	};
};
