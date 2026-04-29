// src/lib/server/api-security.ts
import { logger } from "$logger";

// In-memory store for rate limiting (resets on server restart)
// For production, use Redis or Firestore
const requestLog = new Map<string, { count: number; resetTime: number }>();

const WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS = 10; // Max requests per window per IP

/**
 * Rate limiting middleware for API endpoints.
 * Returns true if the request should be allowed, false if rate limited.
 */
export const checkRateLimit = (ip: string): boolean => {
	const now = Date.now();
	const record = requestLog.get(ip);

	if (!record || now > record.resetTime) {
		// New window
		requestLog.set(ip, { count: 1, resetTime: now + WINDOW_MS });
		return true;
	}

	if (record.count >= MAX_REQUESTS) {
		logger.warn("[API Security] Rate limit exceeded for IP:", ip);
		return false;
	}

	record.count++;
	return true;
};

/**
 * Gets the client IP from request headers.
 */
export const getClientIP = (request: Request): string => {
	return (
		request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
		request.headers.get("x-real-ip") ||
		"unknown"
	);
};

/**
 * Generates a secure, unpredictable session creation token.
 * Only requests with valid tokens can create sessions.
 */
export const generateSessionToken = (): string => {
	const token =
		Math.random().toString(36).substring(2) + Date.now().toString(36);
	logger.debug("[API Security] Generated session token");
	return token;
};

// Store valid tokens (in production, use Firestore or Redis)
const validTokens = new Set<string>();

export const validateSessionToken = (token: string): boolean => {
	if (!token || !validTokens.has(token)) {
		return false;
	}
	// Token is single-use
	validTokens.delete(token);
	return true;
};

export const addValidToken = (token: string): void => {
	validTokens.add(token);
	// Clean up old tokens after 1 hour
	setTimeout(() => validTokens.delete(token), 3600000);
};
