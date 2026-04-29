// src/lib/client/services/session.svelte.ts
import { goto } from "$app/navigation";
import {
	auth,
	onAuthStateChanged,
	signInAnonymously,
} from "$lib/client/firebase/auth.js";
import {
	addDoc,
	collection,
	doc,
	getDoc,
	getFirestoreInstance,
	onSnapshot,
	serverTimestamp,
	setDoc,
	type Timestamp,
} from "$lib/client/firebase/firestore.js";
import { logger } from "$logger";
import type { Session, SessionUser } from "$types";

const USERNAME_KEY = "directors-lounge:username";
const INITIAL_TICKETS = 3;

type SessionServiceType = {
	readonly currentSession: Session | undefined;
	readonly currentUser: SessionUser | undefined;
	readonly uid: string | undefined;
	initialize(): Promise<void>;
	createSession(options: { name?: string }): Promise<string>;
	joinSession(options: {
		sessionId: string;
		displayName: string;
	}): Promise<void>;
	loadSession(options: { sessionId: string }): Promise<void>;
	getSavedUsername(): string | undefined;
};

class SessionService implements SessionServiceType {
	currentSession: Session | undefined = $state(undefined);
	currentUser: SessionUser | undefined = $state(undefined);
	uid: string | undefined = $state(undefined);

	private _unsubscribeSession: (() => void) | undefined;

	initialize = async (): Promise<void> => {
		logger.debug("[SessionService] Initializing Firebase Auth...");
		return new Promise((resolve) => {
			const unsubscribe = onAuthStateChanged(auth, async (user) => {
				unsubscribe();
				if (user) {
					this.uid = user.uid;
					logger.info(
						"[SessionService] Existing auth session found:",
						user.uid,
					);
					resolve();
					return;
				}
				logger.debug(
					"[SessionService] No auth session, signing in anonymously...",
				);
				const credential = await signInAnonymously(auth);
				this.uid = credential.user.uid;
				logger.info(
					"[SessionService] Anonymous auth successful:",
					credential.user.uid,
				);
				resolve();
			});
		});
	};

	createSession = async (options: { name?: string } = {}): Promise<string> => {
		if (!this.uid) {
			logger.error("[SessionService] Not authenticated when creating session");
			throw new Error("Not authenticated. Call initialize() first.");
		}
		logger.debug("[SessionService] Creating new session for host:", this.uid);
		const db = getFirestoreInstance();
		const sessionsRef = collection(db, "sessions");
		const docRef = await addDoc(sessionsRef, {
			hostId: this.uid,
			name: options.name || undefined,
			status: "lobby",
			createdAt: serverTimestamp(),
			winnerNominationId: null,
			pizzaCount: 0,
		});
		logger.info("[SessionService] Session created:", docRef.id);
		return docRef.id;
	};

	joinSession = async (options: {
		sessionId: string;
		displayName: string;
	}): Promise<void> => {
		if (!this.uid) {
			logger.error("[SessionService] Not authenticated when joining session");
			throw new Error("Not authenticated. Call initialize() first.");
		}
		logger.debug(
			"[SessionService] Joining session:",
			options.sessionId,
			"as",
			options.displayName,
		);
		const db = getFirestoreInstance();
		const sessionRef = doc(db, "sessions", options.sessionId);
		const sessionSnap = await getDoc(sessionRef);

		if (!sessionSnap.exists()) {
			logger.warn("[SessionService] Session not found:", options.sessionId);
			throw new Error("Session not found. Check the session ID and try again.");
		}

		logger.info(
			"[SessionService] Session found, joining as:",
			options.displayName,
		);

		if (typeof localStorage !== "undefined") {
			localStorage.setItem(USERNAME_KEY, options.displayName);
			logger.debug("[SessionService] Username saved to localStorage");
		}

		const sessionUserDocId = `${options.sessionId}_${this.uid}`;
		const sessionUserRef = doc(db, "sessionUsers", sessionUserDocId);
		const existingSnap = await getDoc(sessionUserRef);

		if (!existingSnap.exists()) {
			logger.debug("[SessionService] Creating new SessionUser document");
			const sessionUserData: Omit<SessionUser, "id"> = {
				sessionId: options.sessionId,
				uid: this.uid,
				displayName: options.displayName,
				ticketsRemaining: INITIAL_TICKETS,
				votedNominationIds: [],
				wantsPizza: false,
			};
			await setDoc(sessionUserRef, sessionUserData);
		} else {
			logger.debug("[SessionService] SessionUser already exists");
		}

		this.currentUser = {
			id: sessionUserDocId,
			...(existingSnap.exists()
				? (existingSnap.data() as Omit<SessionUser, "id">)
				: {
						sessionId: options.sessionId,
						uid: this.uid,
						displayName: options.displayName,
						ticketsRemaining: INITIAL_TICKETS,
						votedNominationIds: [],
						wantsPizza: false,
					}),
		};
		logger.info(
			"[SessionService] Successfully joined session:",
			options.sessionId,
		);
	};

	loadSession = async (options: { sessionId: string }): Promise<void> => {
		logger.debug("[SessionService] Loading session:", options.sessionId);
		if (this._unsubscribeSession) {
			logger.debug(
				"[SessionService] Unsubscribing from previous session listener",
			);
			this._unsubscribeSession();
		}
		const db = getFirestoreInstance();
		const sessionRef = doc(db, "sessions", options.sessionId);

		return new Promise((resolve, reject) => {
			let resolved = false;
			this._unsubscribeSession = onSnapshot(
				sessionRef,
				(snap) => {
					if (!snap.exists()) {
						logger.warn(
							"[SessionService] Session not found in listener:",
							options.sessionId,
						);
						if (!resolved) {
							resolved = true;
							reject(new Error("Session not found."));
						}
						return;
					}
					const data = snap.data();
					this.currentSession = {
						id: snap.id,
						hostId: data.hostId as string,
						status: data.status as "lobby" | "revealed",
						createdAt: data.createdAt as Timestamp,
						winnerNominationId:
							(data.winnerNominationId as string | null) ?? undefined,
						pizzaCount: (data.pizzaCount as number) ?? 0,
					};
					logger.debug(
						"[SessionService] Session updated:",
						snap.id,
						"status:",
						data.status,
					);

					if (data.status === "revealed") {
						logger.info(
							"[SessionService] Session revealed, navigating to reveal page",
						);
						goto(`/lounge/${options.sessionId}/reveal`);
					}
					if (!resolved) {
						resolved = true;
						resolve();
					}
				},
				(err) => {
					logger.error("[SessionService] Error in session listener:", err);
					if (!resolved) {
						resolved = true;
						reject(err);
					}
				},
			);
		});
	};

	getSavedUsername = (): string | undefined => {
		if (typeof localStorage === "undefined") {
			return undefined;
		}
		return localStorage.getItem(USERNAME_KEY) ?? undefined;
	};
}

export const sessionService = new SessionService();
