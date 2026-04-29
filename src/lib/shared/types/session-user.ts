// src/lib/shared/types/session-user.ts

/** Represents a user's participation in a specific session. */
export type SessionUser = {
	/** Firestore document ID (format: `{sessionId}_{uid}`). */
	id: string;
	sessionId: string;
	uid: string;
	displayName: string;
	photoURL?: string; // Profile picture URL
	ticketsRemaining: number;
	votedNominationIds: string[];
	wantsPizza: boolean;
};
