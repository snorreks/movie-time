// src/lib/viewmodels/entry-hall.viewmodel.svelte.ts
import { goto } from "$app/navigation";
import { auth, signInWithEmailAndPassword } from "$lib/client/firebase/auth.js";
import { sessionService } from "$lib/client/services/session.svelte";
import { logger } from "$logger";

// ---------------------------------------------------------------------------
// EntryHallViewModel type
// ---------------------------------------------------------------------------

/** Public API for the Entry Hall ViewModel. */
type EntryHallViewModelType = {
	/** Display name entered by the user. */
	readonly username: string;
	/** Session ID entered for joining an existing session. */
	readonly sessionIdInput: string;
	/** Session name for admin-created sessions. */
	readonly sessionName: string;
	/** Admin email for login. */
	readonly adminEmail: string;
	/** Admin password for login. */
	readonly adminPassword: string;
	/** True while an async operation is in progress. */
	readonly isLoading: boolean;
	/** True if admin login mode is active. */
	readonly isAdminMode: boolean;
	/** Error message to display, or undefined. */
	readonly error: string | undefined;
	/** Initialises auth and pre-fills username from localStorage. */
	initialize(): Promise<void>;
	/** Creates a new session and navigates to the lounge. */
	createSession(): Promise<void>;
	/** Joins an existing session and navigates to the lounge. */
	joinSession(): Promise<void>;
	/** Admin login with email and password. */
	adminLogin(): Promise<void>;
	/** Toggles admin mode. */
	toggleAdminMode(): void;
	/** Sets the username field. */
	setUsername(value: string): void;
	/** Sets the session ID input field. */
	setSessionIdInput(value: string): void;
	/** Sets the session name field. */
	setSessionName(value: string): void;
	/** Sets the admin email field. */
	setAdminEmail(value: string): void;
	/** Sets the admin password field. */
	setAdminPassword(value: string): void;
};

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class EntryHallViewModel implements EntryHallViewModelType {
	username: string = $state("");
	sessionIdInput: string = $state("");
	sessionName: string = $state("");
	adminEmail: string = $state("");
	adminPassword: string = $state("");
	isLoading: boolean = $state(false);
	isAdminMode: boolean = $state(false);
	error: string | undefined = $state(undefined);

	/**
	 * Initialises Firebase Anonymous Auth and pre-fills the username from
	 * localStorage if a previous session name was stored.
	 */
	initialize = async (): Promise<void> => {
		logger.debug("[EntryHallViewModel] Initializing...");
		await sessionService.initialize();
		const saved = sessionService.getSavedUsername();
		if (saved) {
			this.username = saved;
			logger.debug(
				"[EntryHallViewModel] Username loaded from localStorage:",
				saved,
			);
		}
	};

	/**
	 * Creates a new movie night session and navigates to the lounge.
	 */
	createSession = async (): Promise<void> => {
		if (!this.username.trim()) {
			this.error = "Please enter your name before creating a session.";
			return;
		}
		logger.info("[EntryHallViewModel] Creating session for:", this.username);
		this.isLoading = true;
		this.error = undefined;
		try {
			const sessionId = await sessionService.createSession({
				name: this.sessionName.trim() || undefined,
			});
			logger.debug("[EntryHallViewModel] Session created, joining:", sessionId);
			await sessionService.joinSession({
				sessionId,
				displayName: this.username.trim(),
			});
			await goto(`/lounge/${sessionId}`);
			logger.info("[EntryHallViewModel] Navigated to lounge:", sessionId);
		} catch (err) {
			logger.error("[EntryHallViewModel] Failed to create session:", err);
			this.error =
				err instanceof Error ? err.message : "Failed to create session.";
		} finally {
			this.isLoading = false;
		}
	};

	/**
	 * Admin login with email and password.
	 */
	adminLogin = async (): Promise<void> => {
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
			logger.info("[EntryHallViewModel] Admin login successful");
			// After login, create session
			await this.createSession();
		} catch (err) {
			logger.error("[EntryHallViewModel] Admin login failed:", err);
			this.error =
				err instanceof Error ? "Invalid email or password." : "Login failed.";
		} finally {
			this.isLoading = false;
		}
	};

	/**
	 * Toggles admin mode UI.
	 */
	toggleAdminMode = (): void => {
		this.isAdminMode = !this.isAdminMode;
	};

	/**
	 * Joins an existing session by its ID and navigates to its lounge page.
	 * Shows an error message if the session is not found.
	 */
	joinSession = async (): Promise<void> => {
		if (!this.username.trim()) {
			this.error = "Please enter your name before joining.";
			return;
		}
		if (!this.sessionIdInput.trim()) {
			this.error = "Please enter a session ID to join.";
			return;
		}
		logger.info(
			"[EntryHallViewModel] Joining session:",
			this.sessionIdInput,
			"as:",
			this.username,
		);
		this.isLoading = true;
		this.error = undefined;
		try {
			await sessionService.joinSession({
				sessionId: this.sessionIdInput.trim(),
				displayName: this.username.trim(),
			});
			await goto(`/lounge/${this.sessionIdInput.trim()}`);
			logger.info("[EntryHallViewModel] Joined session successfully");
		} catch (err) {
			logger.error("[EntryHallViewModel] Failed to join session:", err);
			this.error =
				err instanceof Error ? err.message : "Failed to join session.";
		} finally {
			this.isLoading = false;
		}
	};

	/** Updates the username field. */
	setUsername = (value: string): void => {
		this.username = value;
	};

	/** Updates the session ID input field. */
	setSessionIdInput = (value: string): void => {
		this.sessionIdInput = value;
	};

	/** Updates the session name field. */
	setSessionName = (value: string): void => {
		this.sessionName = value;
	};

	/** Updates the admin email field. */
	setAdminEmail = (value: string): void => {
		this.adminEmail = value;
	};

	/** Updates the admin password field. */
	setAdminPassword = (value: string): void => {
		this.adminPassword = value;
	};
}

/** Singleton Entry Hall ViewModel. */
export const entryHallViewModel = new EntryHallViewModel();
