// src/lib/viewmodels/selection-lounge.viewmodel.svelte.ts

import {
	arrayUnion,
	doc,
	getFirestoreInstance,
	increment,
	serverTimestamp,
	setDoc,
	updateDoc,
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
	readonly useAi: boolean;
	readonly isHost: boolean;
	initialize(options: { sessionId: string }): Promise<void>;
	submitConciergePrompt(): Promise<void>;
	castVote(options: { nominationId: string }): Promise<void>;
	vetoNomination(options: { nominationId: string; reason?: string }): Promise<void>;
	togglePizza(): Promise<void>;
	startReveal(): Promise<void>;
	setConciergePrompt(value: string): void;
	setUseAi(value: boolean): void;
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
	useAi: boolean = $state(true);

	get pizzaUsers(): SessionUser[] {
		return this.sessionUsers.filter((u) => u.wantsPizza);
	}

	private _sessionId: string = "";
	private _unsubSession: (() => void) | undefined;

	dispose = (): void => {
		this._unsubSession?.();
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
		this.sessionUser = sessionService.currentUser;
		logger.info("[SelectionLoungeViewModel] Session loaded:", options.sessionId, "status:", this.session?.status);

		const db = getFirestoreInstance();
		const sessionRef = doc(db, "sessions", options.sessionId);

		this._unsubSession = sessionService["_unsubscribeSession"];

		// Use a listener on the session document to update nominations and users
		const unsub = sessionService["_unsubscribeSession"];
		if (unsub) {
			// Already handled by sessionService, just sync data
			this._syncFromSession();
		}
	};

	private _syncFromSession = (): void => {
		if (!this.session) {
			return;
		}
		this.nominations = this.session.nominations || [];
		this.sessionUsers = this.session.users || [];
		this.sessionUser = this.session.users?.find(
			(u) => u.uid === sessionService.uid,
		);
	};

	submitConciergePrompt = async (): Promise<void> => {
		if (!this.conciergePrompt.trim()) {
			return;
		}
		this.isConciergeLoading = true;
		this.conciergeError = undefined;
		const loadingId = Date.now();
		snackbarService.loading(
			this.useAi ? "🤖 Asking the AI Concierge for suggestions..." : "🔍 Searching TMDB directly...",
		);

		try {
			const response = await fetch("/api/concierge", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					prompt: this.conciergePrompt.trim(),
					useAi: this.useAi,
				}),
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

			const db = getFirestoreInstance();
			const sessionRef = doc(db, "sessions", this._sessionId);

			const newNomination: Nomination = {
				id: Date.now().toString(),
				nominatedByUid: sessionService.uid!,
				title: metadata.title,
				posterUrl: metadata.posterUrl,
				genre: metadata.genre,
				year: metadata.year,
				rating: metadata.rating,
				synopsis: metadata.synopsis,
				votes: 0,
				voters: [],
				vetoed: false,
				vetoedByUid: null,
				createdAt: new Date().toISOString(),
			};

			const currentNominations = this.session?.nominations || [];
			await updateDoc(sessionRef, {
				nominations: [...currentNominations, newNomination],
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
		const sessionRef = doc(db, "sessions", this._sessionId);

		const updatedNominations = (this.session?.nominations || []).map((nom) => {
			if (nom.id === options.nominationId) {
				return {
					...nom,
					votes: nom.votes + 1,
					voters: [...(nom.voters || []), { uid: sessionService.uid!, displayName: this.sessionUser?.displayName || '' }],
				};
			}
			return nom;
		});

		const updatedUser = this.sessionUser ? {
			...this.sessionUser,
			ticketsRemaining: this.sessionUser.ticketsRemaining - 1,
			votedNominationIds: [...this.sessionUser.votedNominationIds, options.nominationId],
		} : null;

		const updatedUsers = (this.session?.users || []).map((u) => {
			if (u.uid === sessionService.uid) {
				return updatedUser;
			}
			return u;
		});

		await updateDoc(sessionRef, {
			nominations: updatedNominations,
			users: updatedUsers,
		});
	};

	vetoNomination = async (options: { nominationId: string; reason?: string }): Promise<void> => {
		if (!sessionService.uid) {
			return;
		}

		const db = getFirestoreInstance();
		const sessionRef = doc(db, "sessions", this._sessionId);

		const updatedNominations = (this.session?.nominations || []).map((nom) => {
			if (nom.id === options.nominationId) {
				return {
					...nom,
					vetoed: true,
					vetoedByUid: sessionService.uid,
					vetoReason: options.reason || "No reason given",
				};
			}
			return nom;
		});

		// Return tickets to users who voted for this nomination
		const vetoedNom = this.session?.nominations?.find((n) => n.id === options.nominationId);
		if (!vetoedNom) {
			return;
		}

		const updatedUsers = (this.session?.users || []).map((u) => {
			if (u.votedNominationIds.includes(options.nominationId)) {
				const votesForThis = u.votedNominationIds.filter((id) => id === options.nominationId).length || 1;
				return {
					...u,
					ticketsRemaining: u.ticketsRemaining + votesForThis,
					votedNominationIds: u.votedNominationIds.filter((id) => id !== options.nominationId),
				};
			}
			return u;
		});

		await updateDoc(sessionRef, {
			nominations: updatedNominations,
			users: updatedUsers,
		});
	};

	togglePizza = async (): Promise<void> => {
		if (!this.sessionUser || !sessionService.uid) {
			return;
		}

		const db = getFirestoreInstance();
		const sessionRef = doc(db, "sessions", this._sessionId);

		const updatedUsers = (this.session?.users || []).map((u) => {
			if (u.uid === sessionService.uid) {
				return { ...u, wantsPizza: !u.wantsPizza };
			}
			return u;
		});

		const pizzaCount = updatedUsers.filter((u) => u.wantsPizza).length;

		await updateDoc(sessionRef, {
			users: updatedUsers,
			pizzaCount,
		});
	};

	startReveal = async (): Promise<void> => {
		if (!this.isHost) {
			return;
		}

		try {
			const db = getFirestoreInstance();
			const sessionRef = doc(db, "sessions", this._sessionId);

			// Select weighted winner from non-vetoed nominations
			const eligibleNoms = (this.session?.nominations || []).filter((n) => !n.vetoed);
			if (eligibleNoms.length === 0) {
				snackbarService.error("No eligible nominations to reveal.");
				return;
			}

			const weights = eligibleNoms.map((n) => 1 + n.votes);
			const totalWeight = weights.reduce((sum, w) => sum + w, 0);
			let random = Math.random() * totalWeight;

			let winner: Nomination | undefined;
			for (let i = 0; i < eligibleNoms.length; i++) {
				random -= weights[i];
				if (random <= 0) {
					winner = eligibleNoms[i];
					break;
				}
			}
			if (!winner) {
				winner = eligibleNoms[eligibleNoms.length - 1];
			}

			await updateDoc(sessionRef, {
				winnerNominationId: winner.id,
				status: "revealed",
			});
		} catch (err) {
			logger.error("[SelectionLoungeViewModel] startReveal error:", err);
		}
	};

	setConciergePrompt = (value: string): void => {
		this.conciergePrompt = value;
	};

	setUseAi = (value: boolean): void => {
		this.useAi = value;
	};
}

export const selectionLoungeViewModel = new SelectionLoungeViewModel();
