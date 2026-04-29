// src/lib/client/services/snackbar.svelte.ts
import type { SnackbarType } from "./snackbar-types.js";

type SnackbarMessage = {
	id: number;
	message: string;
	type: SnackbarType;
	duration?: number;
};

let _messages: SnackbarMessage[] = $state([]);
let _counter = 0;

const add = (
	message: string,
	type: SnackbarType = "info",
	duration = 4000,
): void => {
	const id = ++_counter;
	_messages = [..._messages, { id, message, type, duration }];

	if (duration > 0) {
		setTimeout(() => {
			remove(id);
		}, duration);
	}
};

const remove = (id: number): void => {
	_messages = _messages.filter((m) => m.id !== id);
};

export const snackbarService = {
	get messages(): SnackbarMessage[] {
		return _messages;
	},
	info: (msg: string, duration?: number): void => add(msg, "info", duration),
	success: (msg: string, duration?: number): void =>
		add(msg, "success", duration),
	error: (msg: string, duration?: number): void => add(msg, "error", duration),
	loading: (msg: string): void => add(msg, "loading", 0),
	remove: (id: number): void => remove(id),
	clear: (): void => {
		_messages = [];
	},
};
