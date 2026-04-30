// src/lib/viewmodels/selection-lounge.viewmodel.svelte.ts

import { auth } from "$lib/client/firebase/auth.js";
import {
	deleteField,
	doc,
	getFirestoreInstance,
	updateDoc,
} from "$lib/client/firebase/firestore.js";
import { sessionService } from "$lib/client/services/session.svelte";
import { snackbarService } from "$lib/client/services/snackbar.svelte";
import { logger } from "$logger";
import type { Nomination, Session, SessionUser } from "$types";

const INITIAL_TICKETS = 3;

	type SelectionLoungeViewModelType = {
	/** "loading" → auth resolving | "join" → name form | "lounge" → main | "reveal" → winner screen */
	readonly view: "loading" | "join" | "lounge" | "reveal";
	readonly nominations: Nomination[];
	readonly session: Session | undefined;
	readonly sessionUser: SessionUser | undefined;
	readonly sessionUsers: SessionUser[];
	readonly conciergePrompt: string;
	readonly isConciergeLoading: boolean;
	readonly conciergeError: string | undefined;
	readonly useAi: boolean;
	readonly isHost: boolean;
	readonly canStartReveal: boolean;
	readonly username: string;
	readonly isJoinLoading: boolean;
	readonly joinError: string | undefined;
	initialize(options: {
		sessionId: string;
		ssrSession: Session;
		ssrSessionUser: SessionUser | null;
	}): Promise<void>;
	joinLounge(): Promise<void>;
	submitConciergePrompt(): Promise<void>;
	castVote(options: { nominationId: string }): Promise<void>;
	cancelVote(options: { nominationId: string }): Promise<void>;
	vetoNomination(options: {
		nominationId: string;
		reason?: string;
	}): Promise<void>;
	deleteNomination(options: { nominationId: string }): Promise<void>;
	togglePizza(): Promise<void>;
	startReveal(): Promise<void>;
	resetReveal(): Promise<void>;
	setConciergePrompt(value: string): void;
	setUseAi(value: boolean): void;
	setUsername(value: string): void;
	dispose(): void;
};

class SelectionLoungeViewModel implements SelectionLoungeViewModelType {
	view: "loading" | "join" | "lounge" | "reveal" = $state("loading");
	nominations: Nomination[] = $state([]);
	session: Session | undefined = $state(undefined);
	sessionUser: SessionUser | undefined = $state(undefined);
	sessionUsers: SessionUser[] = $state([]);
	conciergePrompt: string = $state("");
	isConciergeLoading: boolean = $state(false);
	conciergeError: string | undefined = $state(undefined);
	useAi: boolean = $state(true);
	username: string = $state("");
	isJoinLoading: boolean = $state(false);
	joinError: string | undefined = $state(undefined);

	private _sessionId: string = "";
	private _stopSync: (() => void) | undefined;

	get pizzaUsers(): SessionUser[] {
		return this.sessionUsers.filter((u) => u.wantsPizza);
	}

	get isHost(): boolean {
		return !!sessionService.uid && sessionService.uid === this.session?.hostId;
	}

	get canStartReveal(): boolean {
		return this.isHost && this.nominations.some((n) => !n.vetoed);
	}

	dispose = (): void => {
		this._stopSync?.();
	};

	/**
	 * Bootstraps the merged lounge page. Hydrates from SSR immediately, resolves
	 * client-side auth, then decides which view to show.
	 */
	initialize = async (options: {
		sessionId: string;
		ssrSession: Session;
		ssrSessionUser: SessionUser | null;
	}): Promise<void> => {
		this._sessionId = options.sessionId;
		logger.info("[SelectionLoungeViewModel] Initializing:", options.sessionId);

		this.session = options.ssrSession;
		this.nominations = options.ssrSession.nominations || [];
		this.sessionUsers = options.ssrSession.users || [];

		await sessionService.initialize();
		logger.debug(
			"[SelectionLoungeViewModel] Auth resolved, uid:",
			sessionService.uid ?? "none",
		);

		if (options.ssrSessionUser) {
			logger.info("[SelectionLoungeViewModel] User already joined (SSR)");
			this.sessionUser = options.ssrSessionUser;
			this._startLiveSync(options.sessionId);
			this.view =
				options.ssrSession.status === "revealed" ? "reveal" : "lounge";
			return;
		}

		if (sessionService.uid) {
			const existingUser = options.ssrSession.users?.find(
				(u) => u.uid === sessionService.uid,
			);
			if (existingUser) {
				logger.info(
					"[SelectionLoungeViewModel] User matched via client auth uid, re-persisting cookie",
				);
				this.sessionUser = existingUser;
				await sessionService.persistSessionCookie();
				this._startLiveSync(options.sessionId);
				this.view =
					options.ssrSession.status === "revealed" ? "reveal" : "lounge";
				return;
			}

			// If user is the host (admin), auto-join them to the lounge
			if (sessionService.uid === options.ssrSession.hostId) {
				logger.info("[SelectionLoungeViewModel] Host detected, auto-joining lounge");
				const hostDisplayName = auth.currentUser?.displayName || "Host";
				this.username = hostDisplayName;
				// Auto-join without anonymous sign-in
				try {
					await sessionService.joinSession({
						sessionId: this._sessionId,
						displayName: hostDisplayName,
					});
					await sessionService.persistSessionCookie();
					this.sessionUser = sessionService.currentUser;
					this._startLiveSync(options.sessionId);
					this.view =
						options.ssrSession.status === "revealed" ? "reveal" : "lounge";
					return;
				} catch (err) {
					logger.error("[SelectionLoungeViewModel] Host auto-join failed:", err);
				}
			}
		}

		const saved = sessionService.getSavedUsername();
		if (saved) {
			this.username = saved;
		}
		logger.info(
			"[SelectionLoungeViewModel] User not joined, showing join form",
		);
		this.view = "join";
	};

	/**
	 * Opens a Firestore `onSnapshot` and wires a reactive `$effect.root` so
	 * every snapshot update flows into the ViewModel's `$state` properties.
	 * Also transitions the view to "reveal" automatically when status flips.
	 */
	private _startLiveSync = (sessionId: string): void => {
		this._stopSync?.();

		this._stopSync = $effect.root(() => {
			$effect(() => {
				const current = sessionService.currentSession;
				if (!current) {
					return;
				}
				this.session = current;
				this.nominations = current.nominations || [];
				this.sessionUsers = current.users || [];

				if (sessionService.uid) {
					const live = current.users?.find((u) => u.uid === sessionService.uid);
					if (live) {
						this.sessionUser = live;
					}
				}

				// Flip views based on session status
				if (current.status === "revealed" && this.view === "lounge") {
					logger.info(
						"[SelectionLoungeViewModel] Status changed to revealed → switching to reveal view",
					);
					this.view = "reveal";
				} else if (current.status === "lobby" && this.view === "reveal") {
					logger.info(
						"[SelectionLoungeViewModel] Status reset to lobby → switching back to lounge",
					);
					this.view = "lounge";
				}

				logger.debug(
					"[SelectionLoungeViewModel] Live sync:",
					this.nominations.length,
					"noms,",
					this.sessionUsers.length,
					"users",
				);
			});
		});

		sessionService.loadSession({ sessionId }).catch((err) => {
			logger.error("[SelectionLoungeViewModel] loadSession error:", err);
		});
	};

	/** Signs in anonymously (if needed), writes the user to Firestore, persists cookie, starts live sync. */
	joinLounge = async (): Promise<void> => {
		if (!this.username.trim()) {
			this.joinError = "Please enter your name to join.";
			return;
		}

		this.isJoinLoading = true;
		this.joinError = undefined;
		logger.info("[SelectionLoungeViewModel] joinLounge:", this.username.trim());

		try {
			// Only sign in anonymously if the user is not already authenticated (e.g., admin host)
			if (!sessionService.uid) {
				await sessionService.signInAnonymously();
			}
			await sessionService.joinSession({
				sessionId: this._sessionId,
				displayName: this.username.trim(),
			});
			await sessionService.persistSessionCookie();

			logger.info("[SelectionLoungeViewModel] Join complete");
			this.view = "lounge";
			this._startLiveSync(this._sessionId);
		} catch (err) {
			logger.error("[SelectionLoungeViewModel] joinLounge error:", err);
			this.joinError =
				err instanceof Error ? err.message : "Failed to join session.";
		} finally {
			this.isJoinLoading = false;
		}
	};

	submitConciergePrompt = async (): Promise<void> => {
		if (!this.conciergePrompt.trim()) {
			return;
		}
		this.isConciergeLoading = true;
		this.conciergeError = undefined;
		// const loadingId = Date.now();
		logger.info("[SelectionLoungeViewModel] submitConciergePrompt:", {
			prompt: this.conciergePrompt.trim(),
			useAi: this.useAi,
		});
		snackbarService.loading(
			this.useAi ? "🤖 AI Concierge thinking..." : "🔍 Searching TMDB...",
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
			logger.debug("[SelectionLoungeViewModel] concierge result:", result);

			if (
				!response.ok ||
				(typeof result === "object" && result !== null && "error" in result)
			) {
				const message =
					typeof result === "object" && result !== null && "error" in result
						? String((result as Record<string, unknown>).error)
						: "The AI Concierge could not find a movie for that prompt.";
				logger.warn("[SelectionLoungeViewModel] Concierge error:", message);
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
			logger.info("[SelectionLoungeViewModel] Got metadata:", metadata.title);

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

			await updateDoc(sessionRef, {
				nominations: [...(this.session?.nominations || []), newNomination],
			});
			logger.info(
				"[SelectionLoungeViewModel] Nomination written:",
				newNomination.title,
			);
			snackbarService.clear();
			snackbarService.success(`"${metadata.title}" added!`);
			this.conciergePrompt = "";
		} catch (err) {
			logger.error(
				"[SelectionLoungeViewModel] submitConciergePrompt error:",
				err,
			);
			this.conciergeError =
				err instanceof Error
					? `Failed: ${err.message}`
					: "An unexpected error occurred.";
			snackbarService.clear();

			snackbarService.error(this.conciergeError);
		} finally {
			this.isConciergeLoading = false;
		}
	};

	castVote = async (options: { nominationId: string }): Promise<void> => {
		if (!this.sessionUser || this.sessionUser.ticketsRemaining <= 0) {
			return;
		}
		if (this.sessionUser.votedNominationIds.includes(options.nominationId)) {
			return;
		}
		logger.info("[SelectionLoungeViewModel] castVote:", options.nominationId);

		const updatedNominations = (this.session?.nominations || []).map((nom) => {
			if (nom.id !== options.nominationId) {
				return nom;
			}
			return {
				...nom,
				votes: nom.votes + 1,
				voters: [
					...(nom.voters || []),
					{
						uid: sessionService.uid!,
						displayName: this.sessionUser?.displayName || "",
					},
				],
			};
		});

		const updatedUsers = (this.session?.users || []).map((u) => {
			if (u.uid !== sessionService.uid) {
				return u;
			}
			return {
				...u,
				ticketsRemaining: u.ticketsRemaining - 1,
				votedNominationIds: [...u.votedNominationIds, options.nominationId],
			};
		});

		try {
			const db = getFirestoreInstance();
			await updateDoc(doc(db, "sessions", this._sessionId), {
				nominations: updatedNominations,
				users: updatedUsers,
			});
			logger.info("[SelectionLoungeViewModel] castVote written");
		} catch (err) {
			logger.error("[SelectionLoungeViewModel] castVote error:", err);
			snackbarService.error("Failed to cast vote.");
		}
	};

	/**
	 * Cancels a previously cast vote, returning the ticket to the user.
	 */
	cancelVote = async (options: { nominationId: string }): Promise<void> => {
		if (!this.sessionUser || !sessionService.uid) {
			return;
		}
		if (!this.sessionUser.votedNominationIds.includes(options.nominationId)) {
			return;
		}
		logger.info("[SelectionLoungeViewModel] cancelVote:", options.nominationId);

		const updatedNominations = (this.session?.nominations || []).map((nom) => {
			if (nom.id !== options.nominationId) {
				return nom;
			}
			return {
				...nom,
				votes: Math.max(0, nom.votes - 1),
				voters: (nom.voters || []).filter((v) => v.uid !== sessionService.uid),
			};
		});

		const updatedUsers = (this.session?.users || []).map((u) => {
			if (u.uid !== sessionService.uid) {
				return u;
			}
			return {
				...u,
				ticketsRemaining: u.ticketsRemaining + 1,
				votedNominationIds: u.votedNominationIds.filter(
					(id) => id !== options.nominationId,
				),
			};
		});

		try {
			const db = getFirestoreInstance();
			await updateDoc(doc(db, "sessions", this._sessionId), {
				nominations: updatedNominations,
				users: updatedUsers,
			});
			logger.info("[SelectionLoungeViewModel] cancelVote written");
		} catch (err) {
			logger.error("[SelectionLoungeViewModel] cancelVote error:", err);
			snackbarService.error("Failed to cancel vote.");
		}
	};

	vetoNomination = async (options: {
		nominationId: string;
		reason?: string;
	}): Promise<void> => {
		if (!sessionService.uid) {
			return;
		}
		const vetoedNom = this.session?.nominations?.find(
			(n) => n.id === options.nominationId,
		);
		if (!vetoedNom) {
			return;
		}
		logger.info(
			"[SelectionLoungeViewModel] vetoNomination:",
			options.nominationId,
		);

		const updatedNominations = (this.session?.nominations || []).map((nom) => {
			if (nom.id !== options.nominationId) {
				return nom;
			}
			return {
				...nom,
				vetoed: true,
				vetoedByUid: sessionService.uid,
				vetoReason: options.reason || "No reason given",
			};
		});

		const updatedUsers = (this.session?.users || []).map((u) => {
			if (!u.votedNominationIds.includes(options.nominationId)) {
				return u;
			}
			const count =
				u.votedNominationIds.filter((id) => id === options.nominationId)
					.length || 1;
			return {
				...u,
				ticketsRemaining: u.ticketsRemaining + count,
				votedNominationIds: u.votedNominationIds.filter(
					(id) => id !== options.nominationId,
				),
			};
		});

		try {
			const db = getFirestoreInstance();
			await updateDoc(doc(db, "sessions", this._sessionId), {
				nominations: updatedNominations,
				users: updatedUsers,
			});
			logger.info("[SelectionLoungeViewModel] vetoNomination written");
		} catch (err) {
			logger.error("[SelectionLoungeViewModel] vetoNomination error:", err);
			snackbarService.error("Failed to veto nomination.");
		}
	};

	/** Completely removes a nomination. Only the creator or host can do this. Votes are returned to users. */
	deleteNomination = async (options: {
		nominationId: string;
	}): Promise<void> => {
		if (!sessionService.uid || !this.session) {
			return;
		}

		const nomToDelete = this.session.nominations?.find(
			(n) => n.id === options.nominationId,
		);
		if (!nomToDelete) {
			return;
		}

		// Only the nomination creator or the host can delete
		if (
			nomToDelete.nominatedByUid !== sessionService.uid &&
			this.session.hostId !== sessionService.uid
		) {
			snackbarService.error("You do not have permission to delete this nomination.");
			return;
		}

		logger.info(
			"[SelectionLoungeViewModel] deleteNomination:",
			options.nominationId,
		);

		// Return votes to users
		const updatedUsers = (this.session?.users || []).map((u) => {
			const voteCount =
				u.votedNominationIds.filter((id) => id === options.nominationId).length || 0;
			if (voteCount === 0) {
				return u;
			}
			return {
				...u,
				ticketsRemaining: u.ticketsRemaining + voteCount,
				votedNominationIds: u.votedNominationIds.filter(
					(id) => id !== options.nominationId,
				),
			};
		});

		const updatedNominations = (this.session?.nominations || []).filter(
			(n) => n.id !== options.nominationId,
		);

		try {
			const db = getFirestoreInstance();
			await updateDoc(doc(db, "sessions", this._sessionId), {
				nominations: updatedNominations,
				users: updatedUsers,
			});
			logger.info("[SelectionLoungeViewModel] deleteNomination written");
			snackbarService.success("Nomination removed.");
		} catch (err) {
			logger.error("[SelectionLoungeViewModel] deleteNomination error:", err);
			snackbarService.error("Failed to delete nomination.");
		}
	};

	togglePizza = async (): Promise<void> => {
		if (!this.sessionUser || !sessionService.uid) {
			return;
		}
		const updatedUsers = (this.session?.users || []).map((u) => {
			if (u.uid !== sessionService.uid) {
				return u;
			}
			return { ...u, wantsPizza: !u.wantsPizza };
		});
		const pizzaCount = updatedUsers.filter((u) => u.wantsPizza).length;

		try {
			const db = getFirestoreInstance();
			await updateDoc(doc(db, "sessions", this._sessionId), {
				users: updatedUsers,
				pizzaCount,
			});
		} catch (err) {
			logger.error("[SelectionLoungeViewModel] togglePizza error:", err);
			snackbarService.error("Failed to update pizza preference.");
		}
	};

	startReveal = async (): Promise<void> => {
		logger.info("[SelectionLoungeViewModel] startReveal");
		try {
			const eligibleNoms = (this.session?.nominations || []).filter(
				(n) => !n.vetoed,
			);
			if (eligibleNoms.length === 0) {
				snackbarService.error("No eligible nominations to reveal.");
				return;
			}

			const weights = eligibleNoms.map((n) => 1 + n.votes);
			const total = weights.reduce((s, w) => s + w, 0);
			let rand = Math.random() * total;
			let winner: Nomination | undefined;
			for (let i = 0; i < eligibleNoms.length; i++) {
				rand -= weights[i];
				if (rand <= 0) {
					winner = eligibleNoms[i];
					break;
				}
			}
			if (!winner) {
				winner = eligibleNoms[eligibleNoms.length - 1];
			}

			const db = getFirestoreInstance();
			await updateDoc(doc(db, "sessions", this._sessionId), {
				winnerNominationId: winner.id,
				status: "revealed",
			});
		} catch (err) {
			logger.error("[SelectionLoungeViewModel] startReveal error:", err);
			snackbarService.error("Failed to start reveal.");
		}
	};

	/** Resets the session back to lobby — triggered by "ff" key chord on the reveal screen. */
	resetReveal = async (): Promise<void> => {
		logger.info("[SelectionLoungeViewModel] resetReveal");
		try {
			await sessionService.initialize();
			const db = getFirestoreInstance();
			await updateDoc(doc(db, "sessions", this._sessionId), {
				status: "lobby",
				winnerNominationId: deleteField(),
			});
		} catch (err) {
			logger.error("[SelectionLoungeViewModel] resetReveal error:", err);
			snackbarService.error("Failed to reset session.");
		}
	};

	setConciergePrompt = (value: string): void => {
		this.conciergePrompt = value;
	};
	setUseAi = (value: boolean): void => {
		this.useAi = value;
	};
	setUsername = (value: string): void => {
		this.username = value;
	};
}

export const selectionLoungeViewModel = new SelectionLoungeViewModel();
