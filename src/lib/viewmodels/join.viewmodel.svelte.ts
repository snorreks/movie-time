// src/lib/viewmodels/join.viewmodel.svelte.ts
import { goto } from "$app/navigation";
import {
	getDoc,
	doc,
	setDoc,
	getFirestoreInstance,
} from "$lib/client/firebase/firestore.js";
import { sessionService } from "$lib/client/services/session.svelte";
import { logger } from "$logger";
import type { SessionUser } from "$types";

const USERNAME_KEY = "directors-lounge:username";
const INITIAL_TICKETS = 3;

type JoinViewModelType = {
	readonly username: string;
	readonly isLoading: boolean;
	readonly error: string | undefined;
	readonly sessionExists: boolean;
	readonly sessionName: string | undefined;
	initialize(options: { sessionId: string }): Promise<void>;
	joinSession(): Promise<void>;
	setUsername(value: string): void;
};

class JoinViewModel implements JoinViewModelType {
	username: string = $state("");
	isLoading: boolean = $state(false);
	error: string | undefined = $state(undefined);
	sessionExists: boolean = $state(false);
	sessionName: string | undefined = $state(undefined);
	private _sessionId: string = "";

	initialize = async (options: { sessionId: string }): Promise<void> => {
		this._sessionId = options.sessionId;
		logger.debug("[JoinViewModel] Initializing for session:", options.sessionId);

		const db = getFirestoreInstance();
		const sessionRef = doc(db, "sessions", options.sessionId);
		const sessionSnap = await getDoc(sessionRef);

		if (!sessionSnap.exists()) {
			this.error = "This session does not exist.";
			this.sessionExists = false;
			return;
		}

		this.sessionExists = true;
		const data = sessionSnap.data();
		this.sessionName = data?.["name"];

		if (typeof localStorage !== "undefined") {
			const saved = localStorage.getItem(USERNAME_KEY);
			if (saved) {
				this.username = saved;
			}
		}

		logger.info("[JoinViewModel] Session found:", options.sessionId);
	};

	joinSession = async (): Promise<void> => {
		if (!this.username.trim()) {
			this.error = "Please enter your name to join.";
			return;
		}

		this.isLoading = true;
		this.error = undefined;

		try {
			await sessionService.signInAnonymously();

			const uid = sessionService.uid;
			if (!uid) {
				throw new Error("Failed to authenticate.");
			}

			logger.info("[JoinViewModel] Joining session:", this._sessionId, "as:", this.username.trim());

			if (typeof localStorage !== "undefined") {
				localStorage.setItem(USERNAME_KEY, this.username.trim());
			}

			const sessionUserDocId = `${this._sessionId}_${uid}`;
			const sessionUserRef = doc(getFirestoreInstance(), "sessionUsers", sessionUserDocId);

			const sessionUserData: Omit<SessionUser, "id"> = {
				sessionId: this._sessionId,
				uid,
				displayName: this.username.trim(),
				ticketsRemaining: INITIAL_TICKETS,
				votedNominationIds: [],
				wantsPizza: false,
			};

			await setDoc(sessionUserRef, sessionUserData, { merge: true });

			logger.info("[JoinViewModel] Successfully joined, navigating to lounge...");
			await goto(`/lounge/${this._sessionId}`);
		} catch (err) {
			logger.error("[JoinViewModel] Failed to join session:", err);
			this.error = err instanceof Error ? err.message : "Failed to join session.";
		} finally {
			this.isLoading = false;
		}
	};

	setUsername = (value: string): void => {
		this.username = value;
	};
}

export const joinViewModel = new JoinViewModel();
