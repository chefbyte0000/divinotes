import type { InitProgressReport } from "@mlc-ai/web-llm";
import {
	ensureInferenceModelLoaded,
	getInferenceClient,
} from "$lib/ai/inference-bootstrap";
import { buildEffectiveSystemPrompt } from "$lib/ai/persona-system-prompt";
import { fetchActivePersonaBySlug, type FetchedPersona } from "$lib/ai/note-summarize";

export const NOTE_TITLE_PERSONA_SLUG = "note-title";

const MAX_BODY_CHARS = 14_000;

function buildPrompt(currentTitle: string, plain: string): string {
	const title = currentTitle.trim() || "Untitled note";
	const body = plain.trim().slice(0, MAX_BODY_CHARS);
	if (!body) {
		return `The note has no body text yet. Current title: "${title}". Reply with exactly: Untitled note`;
	}
	return [
		`Suggest a better title for this note.`,
		``,
		`Current title: ${title}`,
		``,
		`Body:`,
		body,
	].join("\n");
}

function normalizeTitle(raw: string): string {
	let s = raw.replace(/\s+/g, " ").trim();
	s = s.replace(/^["'«»]+|["'«»]+$/g, "").trim();
	if (s.length > 90) s = s.slice(0, 87).trimEnd() + "…";
	return s || "Untitled note";
}

export async function generateNoteAiTitle(options: {
	currentTitle: string;
	plainText: string;
	signal?: AbortSignal;
	onModelProgress?: (report: InitProgressReport) => void;
}): Promise<string> {
	let persona: FetchedPersona | null = null;
	try {
		persona = await fetchActivePersonaBySlug(NOTE_TITLE_PERSONA_SLUG);
	} catch {
		throw new Error("Could not load the note-title persona.");
	}
	if (!persona) {
		throw new Error(
			"The note-title persona is missing. Ask an admin to install starter personas under Admin → AI personas.",
		);
	}

	await ensureInferenceModelLoaded({ onProgress: options.onModelProgress });
	const client = getInferenceClient();
	if (!client) throw new Error("Local AI is unavailable.");

	const cfg = persona.config ?? {};
	const maxTokens =
		typeof cfg.suggestedMaxTokens === "number" ? Math.min(cfg.suggestedMaxTokens, 160) : 120;
	const temperature =
		typeof cfg.suggestedTemperature === "number" ? cfg.suggestedTemperature : 0.32;

	const user = buildPrompt(options.currentTitle, options.plainText);
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

	return normalizeTitle(out);
}
