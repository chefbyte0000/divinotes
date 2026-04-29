import type { InitProgressReport } from "@mlc-ai/web-llm";
import {
	ensureInferenceModelLoaded,
	getInferenceClient,
} from "$lib/ai/inference-bootstrap";
import { buildEffectiveSystemPrompt } from "$lib/ai/persona-system-prompt";
import { fetchActivePersonaBySlug, type FetchedPersona } from "$lib/ai/note-summarize";

export const NOTE_DESCRIPTION_PERSONA_SLUG = "note-description";

function buildPrompt(noteTitle: string, plain: string): string {
	const title = noteTitle.trim() || "Untitled";
	const body = plain.trim().slice(0, 12_000);
	if (!body) {
		return `The note titled "${title}" has no body text. Reply with exactly one sentence stating there is nothing to describe yet.`;
	}
	return [
		`Write the description for this note.`,
		``,
		`Title: ${title}`,
		``,
		`Body excerpt:`,
		body,
		``,
		`Output: 2–4 sentences, plain text only, no markdown symbols.`,
	].join("\n");
}

export async function generateNoteAiDescription(options: {
	noteTitle: string;
	plainText: string;
	signal?: AbortSignal;
	onModelProgress?: (report: InitProgressReport) => void;
}): Promise<string> {
	let persona: FetchedPersona | null = null;
	try {
		persona = await fetchActivePersonaBySlug(NOTE_DESCRIPTION_PERSONA_SLUG);
	} catch {
		throw new Error("Could not load the note-description persona.");
	}
	if (!persona) {
		throw new Error(
			"The note-description persona is missing. Ask an admin to install starter personas under Admin → AI personas.",
		);
	}

	await ensureInferenceModelLoaded({ onProgress: options.onModelProgress });
	const client = getInferenceClient();
	if (!client) throw new Error("Local AI is unavailable.");

	const cfg = persona.config ?? {};
	const maxTokens =
		typeof cfg.suggestedMaxTokens === "number" ? Math.min(cfg.suggestedMaxTokens, 512) : 320;
	const temperature =
		typeof cfg.suggestedTemperature === "number" ? cfg.suggestedTemperature : 0.38;

	const user = buildPrompt(options.noteTitle, options.plainText);
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

	return out.replace(/^["']|["']$/g, "").trim();
}
