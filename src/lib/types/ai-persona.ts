/**
 * JSON for per-persona tuning (temperature hints, future tool flags, etc.).
 * Prefer nesting ad-hoc keys under `extensions` so the shape stays forward-compatible.
 */
export type AiPersonaConfig = {
	suggestedTemperature?: number;
	suggestedMaxTokens?: number;
	extensions?: Record<string, unknown>;
};

/** Well-known capability tags — use freely; DB stores arbitrary strings. */
export const AI_PERSONA_CAPABILITY_SUGGESTIONS = [
	"summarization",
	"recipe",
	"general",
	"writing",
	"code",
	"analysis",
] as const;

export type AiPersonaCapabilitySuggestion = (typeof AI_PERSONA_CAPABILITY_SUGGESTIONS)[number];
