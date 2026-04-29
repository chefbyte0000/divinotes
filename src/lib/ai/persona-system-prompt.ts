import type { AiPersonaConfig } from "$lib/types/ai-persona";

/**
 * Appends strict JSON output rules from persona config to the stored system prompt at inference time.
 */
export function buildEffectiveSystemPrompt(
	baseSystemPrompt: string,
	config: AiPersonaConfig | undefined,
): string {
	const c = config ?? {};
	if (!c.strictJsonOutput) return baseSystemPrompt;

	const lines = [
		baseSystemPrompt.trimEnd(),
		"",
		"---",
		"Strict JSON output:",
		"Reply with ONLY valid JSON (one JSON value). No markdown fences, no prose before or after, no trailing commas.",
	];
	const spec =
		typeof c.jsonOutputSpecification === "string" ? c.jsonOutputSpecification.trim() : "";
	if (spec) {
		lines.push("");
		lines.push("Required JSON shape or schema:");
		lines.push(spec);
	}
	return lines.join("\n");
}
