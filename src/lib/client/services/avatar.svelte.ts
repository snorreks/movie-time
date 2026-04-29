// src/lib/client/services/avatar.svelte.ts

import { adventurer } from "@dicebear/collection";
import { createAvatar } from "@dicebear/core";
import { logger } from "$logger";

/**
 * Generates a default avatar SVG based on a seed string (username).
 * Uses dicebear's adventurer style for cool, unique avatars.
 */
export const generateDefaultAvatar = (seed: string): string => {
	try {
		const avatar = createAvatar(adventurer, {
			seed,
			backgroundColor: ["b6e3f4", "c0aede", "d1d4f9", "ffd5dc", "ffdfbf"],
		});
		return avatar.toString();
	} catch (err) {
		logger.error("[Avatar] Failed to generate default avatar:", err);
		// Fallback: simple SVG with first letter
		const initial = seed.charAt(0).toUpperCase();
		return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
			<rect width="100" height="100" fill="#D4AF37"/>
			<text x="50" y="50" font-size="50" fill="#08080A" text-anchor="middle" dy=".3em">${initial}</text>
		</svg>`;
	}
};

/**
 * Converts SVG string to a data URL for use in <img src>.
 */
export const svgToDataUrl = (svg: string): string => {
	const encoded = encodeURIComponent(svg)
		.replace(/'/g, "%27")
		.replace(/"/g, "%22");
	return `data:image/svg+xml,${encoded}`;
};

/**
 * Gets the avatar URL for a user - either their custom photoURL or a generated default.
 */
export const getAvatarUrl = (user: {
	displayName?: string;
	photoURL?: string;
}): string => {
	if (user.photoURL) {
		return user.photoURL;
	}
	if (user.displayName) {
		const svg = generateDefaultAvatar(user.displayName);
		return svgToDataUrl(svg);
	}
	// Fallback for no display name
	const svg = generateDefaultAvatar("Guest");
	return svgToDataUrl(svg);
};
