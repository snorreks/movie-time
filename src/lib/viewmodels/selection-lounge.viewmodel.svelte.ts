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
import { goto } from "$app/navigation";
import { sessionService } from "$lib/client/services/session.svelte";
import { snackbarService } from "$lib/client/services/snackbar.svelte";
import { logger } from "$logger";
import type { Nomination, Session, SessionUser } from "$types";

type SelectionLoungeViewModelType = {
	readonly nominations: Nomination[];
	readonly session: Session | undefined;
	readonly sessionUser: SessionUser | undefined;
	readonly sessionUsers: SessionUser[];
	readonly conciergePrompt: string;
	readonly isConciergeLoading: boolean;
	readonly conciergeError: string | undefined;
	readonly isHost: boolean;
	initialize(options: { sessionId: string }): Promise<void>;
	submitConciergePrompt(): Promise<void>;
	castVote(options: { nominationId: string }): Promise<void>;
	vetoNomination(options: { nominationId: string; reason?: string }): Promise<void>;
	togglePizza(): Promise<void>;
	startReveal(): Promise<void>;
	setConciergePrompt(value: string): void;
	dispose(): void;
};

class SelectionLoungeViewModel implements SelectionLoungeViewModelType {
	nominations: Nomination[] = $state([]);
	session: Session | undefined = $state(undefined);
	sessionUser: SessionUser | undefined = $state(undefined);
	sessionUsers: SessionUser[] = $state([]);
	conciergePrompt: string = $state("");
	isConciergeLoading: boolean = $state(false);
	conciergeError: string | undefined = $state(undefined);

	get pizzaUsers(): SessionUser[] {
		return this.sessionUsers.filter((u) => u.wantsPizza);
	}

	private _sessionId: string = "";
	private _unsubNominations: (() => void) | undefined;
	private _unsubSessionUser: (() => void) | undefined;
	private _unsubAllUsers: (() => void) | undefined;

	dispose = (): void => {
		this._unsubNominations?.();
		this._unsubSessionUser?.();
		this._unsubAllUsers?.();
	};

	get isHost(): boolean {
		return !!sessionService.uid && sessionService.uid === this.session?.hostId;
	}

	initialize = async (options: { sessionId: string }): Promise<void> => {
		logger.debug("[SelectionLoungeViewModel] Initializing for session:", options.sessionId);
		this._sessionId = options.sessionId;
		await sessionService.initialize();

		if (!sessionService.uid) {
			logger.warn("[SelectionLoungeViewModel] No auth found, redirecting to join page");
			goto(`/join/${options.sessionId}`);
			return;
		}

		await sessionService.loadSession({ sessionId: options.sessionId });
		this.session = sessionService.currentSession;
		logger.info("[SelectionLoungeViewModel] Session loaded:", options.sessionId, "status:", this.session?.status);

		const db = getFirestoreInstance();

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
					nominatedByName: this.sessionUsers.find((u) => u.uid === data.nominatedByUid)?.displayName,
					nominatedByPhotoURL: this.sessionUsers.find((u) => u.uid === data.nominatedByUid)?.photoURL,
				} as Nomination;
			});
		});

		if (sessionService.uid) {
			const sessionUserDocId = `${options.sessionId}_${sessionService.uid}`;
			const sessionUserRef = doc(db, "sessionUsers", sessionUserDocId);
			this._unsubSessionUser = onSnapshot(sessionUserRef, (snap) => {
				if (!snap.exists()) {
					return;
				}
				this.sessionUser = { id: snap.id, ...snap.data() } as SessionUser;
			});
		}

		const allUsersQuery = query(
			collection(db, "sessionUsers"),
			where("sessionId", "==", options.sessionId),
		);
		this._unsubAllUsers = onSnapshot(allUsersQuery, (snap) => {
			this.sessionUsers = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as SessionUser[];
		});
	};

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

			if (!response.ok || (typeof result === "object" && result !== null && "error" in result)) {
				const message = typeof result === "object" && result !== null && "error" in result
					? String((result as Record<string, unknown>).error)
					: "The AI Concierge could not find a movie for that prompt.";
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

			const { addDoc, serverTimestamp, collection: col } = await import("$lib/client/firebase/firestore.js");
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
			const message = err instanceof Error ? `Failed to get suggestion: ${err.message}` : "An unexpected error occurred.";
			this.conciergeError = message;
			snackbarService.error(message);
		} finally {
			this.isConciergeLoading = false;
			snackbarService.remove(loadingId);
		}
	};

	castVote = async (options: { nominationId: string }): Promise<void> => {
		if (!this.sessionUser || this.sessionUser.ticketsRemaining <= 0) {
			return;
		}
		if (this.sessionUser.votedNominationIds.includes(options.nominationId)) {
			return;
		}
		const db = getFirestoreInstance();
		await updateDoc(doc(db, "nominations", options.nominationId), { votes: increment(1) });
		const sessionUserDocId = `${this._sessionId}_${sessionService.uid}`;
		await updateDoc(doc(db, "sessionUsers", sessionUserDocId), {
			ticketsRemaining: increment(-1),
			votedNominationIds: arrayUnion(options.nominationId),
		});
	};

	vetoNomination = async (options: { nominationId: string; reason?: string }): Promise<void> => {
		if (!sessionService.uid) {
			return;
		}
		const db = getFirestoreInstance();
		const nomRef = doc(db, "nominations", options.nominationId);
		const nomSnap = await getDoc(nomRef);

		if (!nomSnap.exists()) {
			return;
		}

		await updateDoc(nomRef, {
			vetoed: true,
			vetoedByUid: sessionService.uid,
			vetoReason: options.reason || "No reason given",
		});

		const sessionUsersSnap = await getDocs(
			query(
				collection(db, "sessionUsers"),
				where("sessionId", "==", this._sessionId),
				where("votedNominationIds", "array-contains", options.nominationId),
			),
		);

		const batch = writeBatch(db);
		sessionUsersSnap.docs.forEach((userDoc) => {
			const userData = userDoc.data() as { votedNominationIds?: string[] };
			const votedIds: string[] = userData.votedNominationIds || [];
			const votesForThis = votedIds.filter((id: string) => id === options.nominationId).length || 1;
			batch.update(userDoc.ref, {
				ticketsRemaining: increment(votesForThis),
				votedNominationIds: votedIds.filter((id) => id !== options.nominationId),
			});
		});

		await batch.commit();
	};

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

	startReveal = async (): Promise<void> => {
		if (!this.isHost) {
			return;
		}
		try {
			const formData = new URLSearchParams();
			formData.append("_action", "startReveal");
			const response = await fetch(`/lounge/${this._sessionId}`, {
				method: "POST",
				headers: { "Content-Type": "application/x-www-form-urlencoded" },
				body: formData.toString(),
			});
			if (!response.ok) {
				throw new Error(await response.text() || "Failed to start reveal.");
			}
		} catch (err) {
			logger.error("[SelectionLoungeViewModel] startReveal error:", err);
		}
	};

	setConciergePrompt = (value: string): void => {
		this.conciergePrompt = value;
	};
}

export const selectionLoungeViewModel = new SelectionLoungeViewModel();
