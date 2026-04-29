// biome-ignore-all lint/style/useNamingConvention: Firebase Remote Config parameter names
// biome-ignore-all lint/suspicious/noExplicitAny: Firebase Remote Config untyped API
// biome-ignore-all lint/suspicious/noConsole: fallback logging
import { getApp } from "firebase-admin/app";
import { getRemoteConfig } from "firebase-admin/remote-config";

export const AI_CONFIG_DEFAULTS = {
	ai_model_name: "vertexai/gemini-1.5-flash",
	ai_model_temperature: 0.7,
	ai_max_tokens: 2048,
	ai_system_prompt: "You are a helpful AI assistant.",
};

export type AiConfig = typeof AI_CONFIG_DEFAULTS;

/**
 * Fetches AI configuration from Firebase Remote Config.
 * Falls back to local defaults if remote config is unavailable.
 */
export const getAiConfig = async (): Promise<AiConfig> => {
	try {
		const template = await getRemoteConfig(getApp()).getTemplate();
		const parameters = template.parameters || {};

		return {
			ai_model_name:
				(parameters.ai_model_name?.defaultValue as any)?.value ||
				AI_CONFIG_DEFAULTS.ai_model_name,
			ai_model_temperature:
				Number((parameters.ai_model_temperature?.defaultValue as any)?.value) ||
				AI_CONFIG_DEFAULTS.ai_model_temperature,
			ai_max_tokens:
				Number((parameters.ai_max_tokens?.defaultValue as any)?.value) ||
				AI_CONFIG_DEFAULTS.ai_max_tokens,
			ai_system_prompt:
				(parameters.ai_system_prompt?.defaultValue as any)?.value ||
				AI_CONFIG_DEFAULTS.ai_system_prompt,
		};
	} catch (error) {
		console.warn("⚠️ Failed to fetch Remote Config, using defaults:", error);
		return AI_CONFIG_DEFAULTS;
	}
};
