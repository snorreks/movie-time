// src/lib/viewmodels/admin.viewmodel.svelte.ts
import { auth, signInWithEmailAndPassword } from "$lib/client/firebase/auth.js";
import { updateProfile } from "firebase/auth";
import { sessionService } from "$lib/client/services/session.svelte";
import { logger } from "$logger";

/** Public API for the Admin ViewModel. */
type AdminViewModelType = {
	isLoggedIn: boolean;
	readonly adminEmail: string;
	readonly adminPassword: string;
	readonly adminUsername: string;
	readonly sessionName: string;
	readonly isLoading: boolean;
	readonly error: string | undefined;
	readonly createdSessionId: string | undefined;
	readonly currentUsername: string | undefined;
	initialize(): Promise<void>;
	login(): Promise<void>;
	createSession(): Promise<void>;
	updateUsername(): Promise<void>;
	setAdminEmail(value: string): void;
	setAdminPassword(value: string): void;
	setAdminUsername(value: string): void;
	setSessionName(value: string): void;
};

class AdminViewModel implements AdminViewModelType {
	isLoggedIn: boolean = $state(false);
	adminEmail: string = $state("");
	adminPassword: string = $state("");
	adminUsername: string = $state("");
	sessionName: string = $state("");
	isLoading: boolean = $state(false);
	error: string | undefined = $state(undefined);
	createdSessionId: string | undefined = $state(undefined);
	currentUsername: string | undefined = $state(undefined);

	initialize = async (): Promise<void> => {
		logger.debug("[AdminViewModel] Initializing...");
		return new Promise((resolve) => {
			const unsubscribe = auth.onAuthStateChanged((user) => {
				unsubscribe();
				if (user && !user.isAnonymous) {
					logger.info("[AdminViewModel] Admin already logged in:", user.email);
					this.isLoggedIn = true;
					this.currentUsername = user.displayName ?? undefined;
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
			const userCredential = await signInWithEmailAndPassword(
				auth,
				this.adminEmail.trim(),
				this.adminPassword,
			);
			logger.info("[AdminViewModel] Admin login successful");
			this.isLoggedIn = true;
			this.currentUsername = userCredential.user.displayName ?? undefined;
			sessionService.uid = userCredential.user.uid;

			// Set session cookie for the admin user
			const idToken = await userCredential.user.getIdToken();
			await fetch("/api/auth/session", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ idToken }),
			});
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

	setAdminUsername = (value: string): void => {
		this.adminUsername = value;
	};

	setSessionName = (value: string): void => {
		this.sessionName = value;
	};

	updateUsername = async (): Promise<void> => {
		const user = auth.currentUser;
		if (!user) {
			this.error = "Not logged in.";
			return;
		}
		if (!this.adminUsername.trim()) {
			this.error = "Username cannot be empty.";
			return;
		}
		this.isLoading = true;
		this.error = undefined;
		try {
			await updateProfile(user, { displayName: this.adminUsername.trim() });
			this.currentUsername = this.adminUsername.trim();
			logger.info("[AdminViewModel] Username updated to:", this.adminUsername.trim());
		} catch (err) {
			logger.error("[AdminViewModel] Failed to update username:", err);
			this.error = err instanceof Error ? err.message : "Failed to update username.";
		} finally {
			this.isLoading = false;
		}
	};
}

export const adminViewModel = new AdminViewModel();
