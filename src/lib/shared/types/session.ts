// src/lib/shared/types/session.ts
import type { Timestamp } from "firebase/firestore";
import type { SessionUser } from "./session-user";

/** Represents the status lifecycle of a movie night session. */
export type SessionStatus = "lobby" | "revealed";

/** Firestore document shape - all data embedded in session document. */
export type Session = {
	id: string;
	hostId: string;
	name?: string;
	status: SessionStatus;
	createdAt: Timestamp;
	winnerNominationId: string | undefined;
	pizzaCount: number;
	/** Embedded nominations array. */
	nominations: Nomination[];
	/** Embedded session users array. */
	users: SessionUser[];
};

/** Nomination embedded in session document. */
export type Nomination = {
	id: string;
	nominatedByUid: string;
	nominatedByName?: string;
	nominatedByPhotoURL?: string;
	title: string;
	posterUrl: string;
	genre: string;
	year: number;
	rating: number;
	synopsis: string;
	votes: number;
	voters: Array<{ uid: string; displayName: string; photoURL?: string }>;
	vetoed: boolean;
	vetoedByUid: string | null;
	vetoedByName?: string;
	vetoReason?: string;
	createdAt: string;
};
