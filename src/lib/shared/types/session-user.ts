// src/lib/shared/types/session-user.ts

/** Represents a user's participation in a session. Embedded in session document. */
export type SessionUser = {
	uid: string;
	displayName: string;
	photoURL?: string;
	ticketsRemaining: number;
	votedNominationIds: string[];
	wantsPizza: boolean;
};
