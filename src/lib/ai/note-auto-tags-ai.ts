import type { InitProgressReport } from "@mlc-ai/web-llm";
import {
	ensureInferenceModelLoaded,
	getInferenceClient,
} from "$lib/ai/inference-bootstrap";
import { buildEffectiveSystemPrompt } from "$lib/ai/persona-system-prompt";
import { fetchActivePersonaBySlug, type FetchedPersona } from "$lib/ai/note-summarize";
import { mergeTagsUnionDedupe, parseTagsFromModelOutput } from "$lib/notes/note-tags";

export const NOTE_AUTO_TAGS_PERSONA_SLUG = "note-auto-tags";

const MAX_BODY_CHARS = 12_000;

function buildPrompt(noteTitle: string, plain: string): string {
	const title = noteTitle.trim() || "Untitled";
	const body = plain.trim().slice(0, MAX_BODY_CHARS);
	if (!body) {
		return [
			`The note titled "${title}" has no body text.`,
			`Reply with exactly: []`,
		].join("\n");
	}
	return [
		`Suggest tags for this note. Reply with ONLY a JSON array of strings, nothing else.`,
		``,
		`Title: ${title}`,
		``,
		`Body:`,
		body,
	].join("\n");
}

/**
 * Runs local WebLLM with the note-auto-tags persona; merges AI suggestions with existing tags.
 */
export async function generateNoteAutoTags(options: {
	noteTitle: string;
	plainText: string;
	existingTags?: string[];
	signal?: AbortSignal;
	onModelProgress?: (report: InitProgressReport) => void;
}): Promise<string[]> {
	let persona: FetchedPersona | null = null;
	try {
		persona = await fetchActivePersonaBySlug(NOTE_AUTO_TAGS_PERSONA_SLUG);
	} catch {
		throw new Error("Could not load the note-auto-tags persona.");
	}
	if (!persona) {
		throw new Error(
			"The note-auto-tags persona is missing. Ask an admin to install starter personas under Admin → AI personas.",
		);
	}

	const plain = options.plainText.trim();
	if (!plain) {
		return mergeTagsUnionDedupe(options.existingTags, []);
	}

	await ensureInferenceModelLoaded({ onProgress: options.onModelProgress });
	const client = getInferenceClient();
	if (!client) throw new Error("Local AI is unavailable.");

	const cfg = persona.config ?? {};
	const maxTokens =
		typeof cfg.suggestedMaxTokens === "number" ? Math.min(cfg.suggestedMaxTokens, 512) : 256;
	const temperature =
		typeof cfg.suggestedTemperature === "number" ? cfg.suggestedTemperature : 0.25;

	const user = buildPrompt(options.noteTitle, plain);
	const systemContent = buildEffectiveSystemPrompt(persona.systemPrompt, persona.config);
	let out = "";

	for await (const chunk of client.generateCompletion({
		mode: "chat",
		messages: [
			{ role: "system", content: systemContent },
			{ role: "user", content: user },
		],
		stream: true,
		temperature,
		max_tokens: maxTokens,
	})) {
		if (options.signal?.aborted) {
			client.interrupt();
			throw new DOMException("Aborted", "AbortError");
		}
		out += chunk;
	}

	const parsed = parseTagsFromModelOutput(out);
	if (parsed === null) {
		throw new Error("Could not parse tags from the model. Try again.");
	}

	return mergeTagsUnionDedupe(options.existingTags, parsed);
}
