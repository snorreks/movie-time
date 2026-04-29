// src/lib/shared/types/nomination.ts

/** Structured metadata for a nominated movie. */
export type Nomination = {
	/** Firestore document ID. */
	id: string;
	sessionId: string;
	nominatedByUid: string;
	nominatedByName?: string; // Display name of person who nominated
	nominatedByPhotoURL?: string; // Profile picture
	title: string;
	posterUrl: string;
	genre: string;
	year: number;
	rating: number;
	synopsis: string;
	votes: number;
	voters?: Array<{ uid: string; displayName: string; photoURL?: string }>; // Track who voted
	vetoed: boolean;
	vetoedByUid: string | null;
	vetoedByName?: string;
	vetoReason?: string;
	createdAt: string; // ISO string for serialization
};

/** Structured movie metadata returned by the AI Concierge flow. */
export type MovieMetadata = {
	title: string;
	posterUrl: string;
	genre: string;
	year: number;
	rating: number;
	synopsis: string;
};

/** Error payload returned when no movie is found. */
export type MovieMetadataError = {
	error: string;
};

/** Union result type for the AI Concierge flow. */
export type MovieMetadataResult = MovieMetadata | MovieMetadataError;
