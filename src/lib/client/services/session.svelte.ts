// src/lib/client/services/session.svelte.ts
import {
	auth,
	getIdToken,
	onAuthStateChanged,
	signInAnonymously,
} from "$lib/client/firebase/auth.js";
import {
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
	joinSession(options: { sessionId: string; displayName: string }): Promise<void>;
	loadSession(options: { sessionId: string }): Promise<void>;
	getSavedUsername(): string | undefined;
	signInAnonymously(): Promise<void>;
	/** POSTs the current user's ID token to the server so it can set an httpOnly session cookie. */
	persistSessionCookie(): Promise<void>;
	/** Asks the server to clear the session cookie (sign-out). */
	clearSessionCookie(): Promise<void>;
};

class SessionService implements SessionServiceType {
	currentSession: Session | undefined = $state(undefined);
	currentUser: SessionUser | undefined = $state(undefined);
	uid: string | undefined = $state(undefined);

	private _unsubscribeSession: (() => void) | undefined;

	initialize = async (): Promise<void> => {
		logger.debug("[SessionService] Initializing Firebase Auth...");
		return new Promise((resolve) => {
			const unsubscribe = onAuthStateChanged(auth, (user) => {
				unsubscribe();
				if (user) {
					this.uid = user.uid;
					logger.info(
						"[SessionService] Existing auth session found:",
						user.uid,
						"isAnonymous:",
						user.isAnonymous,
					);
				} else {
					logger.debug("[SessionService] No auth session found");
				}
				resolve();
			});
		});
	};

	signInAnonymously = async (): Promise<void> => {
		if (this.uid && auth.currentUser?.isAnonymous) {
			logger.debug("[SessionService] Already signed in anonymously");
			return;
		}
		logger.debug("[SessionService] Signing in anonymously...");
		const credential = await signInAnonymously(auth);
		this.uid = credential.user.uid;
		logger.info("[SessionService] Anonymous auth successful:", credential.user.uid);
	};

	persistSessionCookie = async (): Promise<void> => {
		const user = auth.currentUser;
		if (!user) {
			logger.warn("[SessionService] persistSessionCookie: no current user");
			return;
		}
		logger.debug("[SessionService] Fetching ID token to persist session cookie...");
		const idToken = await getIdToken(user);
		const response = await fetch("/api/auth/session", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ idToken }),
		});
		if (!response.ok) {
			logger.warn("[SessionService] Failed to persist session cookie, status:", response.status);
			return;
		}
		logger.info("[SessionService] Session cookie persisted for uid:", this.uid);
	};

	clearSessionCookie = async (): Promise<void> => {
		logger.debug("[SessionService] Clearing session cookie...");
		await fetch("/api/auth/session", { method: "DELETE" });
		logger.info("[SessionService] Session cookie cleared");
	};

	createSession = async (options: { name?: string } = {}): Promise<string> => {
		if (!this.uid) {
			logger.error("[SessionService] Not authenticated when creating session");
			throw new Error("Not authenticated. Call initialize() first.");
		}
		logger.debug("[SessionService] Creating new session for host:", this.uid);
		const db = getFirestoreInstance();
		const sessionsRef = doc(collection(db, "sessions"));
		const sessionId = sessionsRef.id;

		// Firestore rejects `undefined` values — omit optional fields entirely.
		const newSession: Record<string, unknown> = {
			hostId: this.uid,
			status: "lobby",
			createdAt: serverTimestamp(),
			pizzaCount: 0,
			nominations: [],
			users: [],
		};

		if (options.name) {
			newSession["name"] = options.name;
		}

		await setDoc(sessionsRef, newSession);
		logger.info("[SessionService] Session created:", sessionId);
		return sessionId;
	};

	joinSession = async (options: {
		sessionId: string;
		displayName: string;
	}): Promise<void> => {
		if (!this.uid) {
			logger.error("[SessionService] Not authenticated when joining session");
			throw new Error("Not authenticated. Call initialize() first.");
		}
		logger.debug("[SessionService] Joining session:", options.sessionId, "as", options.displayName);

		const db = getFirestoreInstance();
		const sessionRef = doc(db, "sessions", options.sessionId);
		const sessionSnap = await getDoc(sessionRef);

		if (!sessionSnap.exists()) {
			logger.warn("[SessionService] Session not found:", options.sessionId);
			throw new Error("Session not found. Check the session ID and try again.");
		}

		logger.info("[SessionService] Session found, joining as:", options.displayName);

		if (typeof localStorage !== "undefined") {
			localStorage.setItem(USERNAME_KEY, options.displayName);
			logger.debug("[SessionService] Username saved to localStorage");
		}

		const newUser: SessionUser = {
			uid: this.uid,
			displayName: options.displayName,
			ticketsRemaining: INITIAL_TICKETS,
			votedNominationIds: [],
			wantsPizza: false,
		};

		const sessionData = sessionSnap.data() as Session;
		const existingUser = sessionData.users?.find((u) => u.uid === this.uid);

		if (!existingUser) {
			logger.debug("[SessionService] Adding new user to session");
			await setDoc(
				sessionRef,
				{ users: [...(sessionData.users || []), newUser] },
				{ merge: true },
			);
		}

		this.currentUser = existingUser || newUser;
		logger.info("[SessionService] Successfully joined session:", options.sessionId);
	};

	loadSession = async (options: { sessionId: string }): Promise<void> => {
		logger.debug("[SessionService] Loading session:", options.sessionId);
		if (this._unsubscribeSession) {
			logger.debug("[SessionService] Unsubscribing from previous session listener");
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
						logger.warn("[SessionService] Session not found in listener:", options.sessionId);
						if (!resolved) {
							resolved = true;
							reject(new Error("Session not found."));
						}
						return;
					}
					const data = snap.data() as Session;
					this.currentSession = { ...data, id: snap.id };

					if (this.uid && this.currentSession.users) {
						this.currentUser = this.currentSession.users.find((u) => u.uid === this.uid);
					}

					logger.debug("[SessionService] Session updated:", snap.id, "status:", data.status);

					// Navigation on status change is handled by the ViewModel's live sync effect
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
