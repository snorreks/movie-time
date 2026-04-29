// src/lib/viewmodels/selection-lounge.viewmodel.svelte.ts

import {
	arrayUnion,
	collection,
	doc,
	getDoc,
	getDocs,
	getFirestoreInstance,
	increment,
	onSnapshot,
	orderBy,
	query,
	updateDoc,
	where,
	writeBatch,
} from "$lib/client/firebase/firestore.js";
import { sessionService } from "$lib/client/services/session.svelte";
import { snackbarService } from "$lib/client/services/snackbar.svelte";
import { logger } from "$logger";
import type { Nomination, Session, SessionUser } from "$types";

// ---------------------------------------------------------------------------
// SelectionLoungeViewModel type
// ---------------------------------------------------------------------------

/** Public API for the Selection Lounge ViewModel. */
type SelectionLoungeViewModelType = {
	readonly nominations: Nomination[];
	readonly session: Session | undefined;
	readonly sessionUser: SessionUser | undefined;
	readonly sessionUsers: SessionUser[]; // All users in session
	readonly conciergePrompt: string;
	readonly isConciergeLoading: boolean;
	readonly conciergeError: string | undefined;
	readonly isHost: boolean;
	/** Initialises real-time listeners for the given session. */
	initialize(options: { sessionId: string }): Promise<void>;
	/** Submits the current concierge prompt to the AI. */
	submitConciergePrompt(): Promise<void>;
	/** Casts a Golden Ticket vote on a nomination. */
	castVote(options: { nominationId: string }): Promise<void>;
	/** Marks a nomination as vetoed. */
	vetoNomination(options: {
		nominationId: string;
		reason?: string;
	}): Promise<void>;
	/** Toggles the current user's pizza preference. */
	togglePizza(): Promise<void>;
	/** Triggers the Grand Reveal server action (host only). */
	startReveal(): Promise<void>;
	/** Updates the concierge prompt input value. */
	setConciergePrompt(value: string): void;
	/** Unsubscribes all real-time Firestore listeners. */
	dispose(): void;
};

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class SelectionLoungeViewModel implements SelectionLoungeViewModelType {
	nominations: Nomination[] = $state([]);
	session: Session | undefined = $state(undefined);
	sessionUser: SessionUser | undefined = $state(undefined);
	sessionUsers: SessionUser[] = $state([]); // All users in session
	conciergePrompt: string = $state("");
	isConciergeLoading: boolean = $state(false);
	conciergeError: string | undefined = $state(undefined);

	/** Users who want pizza. */
	get pizzaUsers(): SessionUser[] {
		return this.sessionUsers.filter((u) => u.wantsPizza);
	}

	private _sessionId: string = "";
	private _unsubNominations: (() => void) | undefined;
	private _unsubSessionUser: (() => void) | undefined;
	private _unsubAllUsers: (() => void) | undefined;

	/** Unsubscribes all real-time Firestore listeners. */
	dispose = (): void => {
		this._unsubNominations?.();
		this._unsubSessionUser?.();
		this._unsubAllUsers?.();
	};

	/** True if the current user is the host of the session. */
	get isHost(): boolean {
		return !!sessionService.uid && sessionService.uid === this.session?.hostId;
	}

	/**
	 * Loads the session and subscribes to real-time nominations and session-user
	 * documents for the given session ID.
	 */
	initialize = async (options: { sessionId: string }): Promise<void> => {
		logger.debug(
			"[SelectionLoungeViewModel] Initializing for session:",
			options.sessionId,
		);
		this._sessionId = options.sessionId;
		await sessionService.initialize();
		await sessionService.loadSession({ sessionId: options.sessionId });

		// Mirror session from service into local state
		this.session = sessionService.currentSession;
		logger.info(
			"[SelectionLoungeViewModel] Session loaded:",
			options.sessionId,
			"status:",
			this.session?.status,
		);

		const db = getFirestoreInstance();

		// Real-time nominations listener (ordered by votes desc)
		const nominationsQuery = query(
			collection(db, "nominations"),
			where("sessionId", "==", options.sessionId),
			orderBy("votes", "desc"),
		);

		this._unsubNominations = onSnapshot(nominationsQuery, (snap) => {
			this.nominations = snap.docs.map((d) => {
				const data = d.data();
				return {
					id: d.id,
					...data,
					nominatedByName: this.sessionUsers.find(
						(u) => u.uid === data.nominatedByUid,
					)?.displayName,
					nominatedByPhotoURL: this.sessionUsers.find(
						(u) => u.uid === data.nominatedByUid,
					)?.photoURL,
				} as Nomination;
			});
			logger.debug(
				"[SelectionLoungeViewModel] Nominations updated, count:",
				this.nominations.length,
			);
		});

		// Real-time session-user listener (sync tickets / pizza state)
		if (sessionService.uid) {
			const sessionUserDocId = `${options.sessionId}_${sessionService.uid}`;
			const sessionUserRef = doc(db, "sessionUsers", sessionUserDocId);
			this._unsubSessionUser = onSnapshot(sessionUserRef, (snap) => {
				if (!snap.exists()) {
					return;
				}
				this.sessionUser = {
					id: snap.id,
					...snap.data(),
				} as SessionUser;
				logger.debug(
					"[SelectionLoungeViewModel] SessionUser updated, tickets remaining:",
					this.sessionUser.ticketsRemaining,
				);
			});
		}

		// Load all session users for display
		const allUsersQuery = query(
			collection(db, "sessionUsers"),
			where("sessionId", "==", options.sessionId),
		);
		this._unsubAllUsers = onSnapshot(allUsersQuery, (snap) => {
			this.sessionUsers = snap.docs.map((d) => ({
				id: d.id,
				...d.data(),
			})) as SessionUser[];
			logger.debug(
				"[SelectionLoungeViewModel] All session users updated, count:",
				this.sessionUsers.length,
			);
		});
	};

	/**
	 * Submits the AI Concierge prompt. On success, creates a Nomination document
	 * in Firestore with the returned metadata.
	 */
	submitConciergePrompt = async (): Promise<void> => {
		if (!this.conciergePrompt.trim()) {
			return;
		}
		this.isConciergeLoading = true;
		this.conciergeError = undefined;
		const loadingId = Date.now();
		snackbarService.loading("🤖 Asking the AI Concierge for suggestions...");

		try {
			const response = await fetch("/api/concierge", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ prompt: this.conciergePrompt.trim() }),
			});

			const result: unknown = await response.json();

			if (
				!response.ok ||
				(typeof result === "object" && result !== null && "error" in result)
			) {
				const message =
					typeof result === "object" && result !== null && "error" in result
						? String((result as Record<string, unknown>).error)
						: "The AI Concierge could not find a movie for that prompt. Please try a different description.";
				this.conciergeError = message;
				snackbarService.error(message);
				return;
			}

			const metadata = result as {
				title: string;
				posterUrl: string;
				genre: string;
				year: number;
				rating: number;
				synopsis: string;
			};

			// Create nomination document
			const {
				addDoc,
				serverTimestamp,
				collection: col,
			} = await import("$lib/client/firebase/firestore.js");
			const db = getFirestoreInstance();
			await addDoc(col(db, "nominations"), {
				sessionId: this._sessionId,
				nominatedByUid: sessionService.uid,
				title: metadata.title,
				posterUrl: metadata.posterUrl,
				genre: metadata.genre,
				year: metadata.year,
				rating: metadata.rating,
				synopsis: metadata.synopsis,
				votes: 0,
				vetoed: false,
				vetoedByUid: null,
				createdAt: serverTimestamp(),
			});

			snackbarService.success(`✅ "${metadata.title}" added to nominations!`);
			this.conciergePrompt = "";
		} catch (err) {
			const message =
				err instanceof Error
					? `Failed to get suggestion: ${err.message}`
					: "An unexpected error occurred while contacting the AI Concierge.";
			this.conciergeError = message;
			snackbarService.error(message);
		} finally {
			this.isConciergeLoading = false;
			snackbarService.remove(loadingId);
		}
	};

	/**
	 * Casts one Golden Ticket vote on the specified nomination.
	 * No-ops if the user has no remaining tickets or has already voted on this nomination.
	 */
	castVote = async (options: { nominationId: string }): Promise<void> => {
		if (!this.sessionUser || this.sessionUser.ticketsRemaining <= 0) {
			return;
		}
		if (this.sessionUser.votedNominationIds.includes(options.nominationId)) {
			return;
		}
		const db = getFirestoreInstance();

		// Atomically increment vote count on nomination
		await updateDoc(doc(db, "nominations", options.nominationId), {
			votes: increment(1),
		});

		// Decrement user's tickets and record voted nomination
		const sessionUserDocId = `${this._sessionId}_${sessionService.uid}`;
		await updateDoc(doc(db, "sessionUsers", sessionUserDocId), {
			ticketsRemaining: increment(-1),
			votedNominationIds: arrayUnion(options.nominationId),
		});
	};

	/**
	 * Marks the specified nomination as vetoed by the current user.
	 */
	vetoNomination = async (options: {
		nominationId: string;
		reason?: string;
	}): Promise<void> => {
		if (!sessionService.uid) {
			return;
		}
		logger.info(
			"[SelectionLoungeViewModel] Vetoing nomination:",
			options.nominationId,
			"reason:",
			options.reason,
		);

		const db = getFirestoreInstance();

		// Get the nomination to check who voted
		const nomRef = doc(db, "nominations", options.nominationId);
		const nomSnap = await getDoc(nomRef);

		if (!nomSnap.exists()) {
			logger.warn("[SelectionLoungeViewModel] Nomination not found for veto");
			return;
		}

		// Update nomination with veto info
		await updateDoc(nomRef, {
			vetoed: true,
			vetoedByUid: sessionService.uid,
			vetoReason: options.reason || "No reason given",
		});

		// Return votes to users who voted for this nomination
		const sessionUsersSnap = await getDocs(
			query(
				collection(db, "sessionUsers"),
				where("sessionId", "==", this._sessionId),
				where("votedNominationIds", "array-contains", options.nominationId),
			),
		);

		logger.debug(
			"[SelectionLoungeViewModel] Returning tickets to",
			sessionUsersSnap.size,
			"users",
		);

		const batch = writeBatch(db);
		sessionUsersSnap.docs.forEach((userDoc) => {
			const userData = userDoc.data();
			const votedIds: string[] = userData.votedNominationIds || [];
			const votesForThis =
				votedIds.filter((id: string) => id === options.nominationId).length ||
				1;

			batch.update(userDoc.ref, {
				ticketsRemaining: increment(votesForThis),
				votedNominationIds: votedIds.filter(
					(id: string) => id !== options.nominationId,
				),
			});
		});

		await batch.commit();
		logger.info("[SelectionLoungeViewModel] Veto complete, tickets returned");
	};

	/**
	 * Toggles the current user's pizza preference in their SessionUser document.
	 */
	togglePizza = async (): Promise<void> => {
		if (!this.sessionUser || !sessionService.uid) {
			return;
		}
		const db = getFirestoreInstance();
		const sessionUserDocId = `${this._sessionId}_${sessionService.uid}`;
		await updateDoc(doc(db, "sessionUsers", sessionUserDocId), {
			wantsPizza: !this.sessionUser.wantsPizza,
		});
	};

	/**
	 * Calls the server action to compute the weighted-random winner and set the
	 * session status to "revealed". Only the host should call this.
	 */
	startReveal = async (): Promise<void> => {
		if (!this.isHost) {
			logger.warn("[SelectionLoungeViewModel] Non-host tried to start reveal");
			return;
		}
		logger.info(
			"[SelectionLoungeViewModel] Starting Grand Reveal for session:",
			this._sessionId,
		);
		try {
			const formData = new URLSearchParams();
			formData.append("_action", "startReveal");

			const response = await fetch(`/lounge/${this._sessionId}`, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: formData.toString(),
			});

			if (!response.ok) {
				const text = await response.text();
				logger.error(
					"[SelectionLoungeViewModel] Failed to start reveal:",
					text,
				);
				throw new Error(text || "Failed to start reveal.");
			}
			logger.info(
				"[SelectionLoungeViewModel] Reveal action triggered successfully",
			);
		} catch (err) {
			// Navigation will happen automatically via the session listener
			logger.error("[SelectionLoungeViewModel] startReveal error:", err);
		}
	};

	/** Updates the concierge prompt input. */
	setConciergePrompt = (value: string): void => {
		this.conciergePrompt = value;
	};
}

/** Singleton Selection Lounge ViewModel — manages nominations, voting, veto, and reveal state. */
export const selectionLoungeViewModel = new SelectionLoungeViewModel();
