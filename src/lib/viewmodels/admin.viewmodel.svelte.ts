// src/lib/viewmodels/admin.viewmodel.svelte.ts
import { auth, signInWithEmailAndPassword } from "$lib/client/firebase/auth.js";
import { sessionService } from "$lib/client/services/session.svelte";
import { logger } from "$logger";

/** Public API for the Admin ViewModel. */
type AdminViewModelType = {
	readonly isLoggedIn: boolean;
	readonly adminEmail: string;
	readonly adminPassword: string;
	readonly sessionName: string;
	readonly isLoading: boolean;
	readonly error: string | undefined;
	readonly createdSessionId: string | undefined;
	initialize(): Promise<void>;
	login(): Promise<void>;
	createSession(): Promise<void>;
	setAdminEmail(value: string): void;
	setAdminPassword(value: string): void;
	setSessionName(value: string): void;
};

class AdminViewModel implements AdminViewModelType {
	isLoggedIn: boolean = $state(false);
	adminEmail: string = $state("");
	adminPassword: string = $state("");
	sessionName: string = $state("");
	isLoading: boolean = $state(false);
	error: string | undefined = $state(undefined);
	createdSessionId: string | undefined = $state(undefined);

	initialize = async (): Promise<void> => {
		logger.debug("[AdminViewModel] Initializing...");
		return new Promise((resolve) => {
			const unsubscribe = auth.onAuthStateChanged((user) => {
				unsubscribe();
				if (user && !user.isAnonymous) {
					logger.info("[AdminViewModel] Admin already logged in:", user.email);
					this.isLoggedIn = true;
					sessionService.uid = user.uid;
				}
				resolve();
			});
		});
	};

	login = async (): Promise<void> => {
		if (!this.adminEmail.trim() || !this.adminPassword) {
			this.error = "Please enter both email and password.";
			return;
		}
		this.isLoading = true;
		this.error = undefined;
		try {
			await signInWithEmailAndPassword(
				auth,
				this.adminEmail.trim(),
				this.adminPassword,
			);
			logger.info("[AdminViewModel] Admin login successful");
			this.isLoggedIn = true;
			sessionService.uid = auth.currentUser?.uid;
		} catch (err) {
			logger.error("[AdminViewModel] Admin login failed:", err);
			this.error = err instanceof Error ? "Invalid email or password." : "Login failed.";
		} finally {
			this.isLoading = false;
		}
	};

	createSession = async (): Promise<void> => {
		if (!sessionService.uid) {
			this.error = "Not authenticated. Please log in again.";
			return;
		}
		this.isLoading = true;
		this.error = undefined;
		try {
			const sessionId = await sessionService.createSession({
				name: this.sessionName.trim() || undefined,
			});
			logger.info("[AdminViewModel] Session created:", sessionId);
			this.createdSessionId = sessionId;
		} catch (err) {
			logger.error("[AdminViewModel] Failed to create session:", err);
			this.error =
				err instanceof Error ? err.message : "Failed to create session.";
		} finally {
			this.isLoading = false;
		}
	};

	setAdminEmail = (value: string): void => {
		this.adminEmail = value;
	};

	setAdminPassword = (value: string): void => {
		this.adminPassword = value;
	};

	setSessionName = (value: string): void => {
		this.sessionName = value;
	};
}

export const adminViewModel = new AdminViewModel();
