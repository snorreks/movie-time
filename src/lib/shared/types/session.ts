// src/lib/shared/types/session.ts
import type { Timestamp } from "firebase/firestore";

/** Represents the status lifecycle of a movie night session. */
export type SessionStatus = "lobby" | "revealed";

/** Firestore document shape for the `sessions` collection. */
export type Session = {
	id: string;
	hostId: string;
	name?: string;
	status: SessionStatus;
	createdAt: Timestamp;
	winnerNominationId: string | undefined;
	pizzaCount: number;
};
