import type { InitProgressReport } from "@mlc-ai/web-llm";
import type { AiPersonaConfig } from "$lib/types/ai-persona";
import {
	ensureInferenceModelLoaded,
	getInferenceClient,
} from "$lib/ai/inference-bootstrap";

export const NOTE_SUMMARIZER_PERSONA_SLUG = "note-summarizer";

/** Rough cap so prompts stay within typical context budgets. */
const MAX_NOTE_PLAIN_CHARS = 45_000;

export type FetchedPersona = {
	slug: string;
	name: string;
	description: string | null;
	systemPrompt: string;
	capabilityTags: string[];
	config: AiPersonaConfig;
};

export async function fetchActivePersonaBySlug(slug: string): Promise<FetchedPersona | null> {
	const r = await fetch(`/api/ai/personas/${encodeURIComponent(slug)}`);
	if (r.status === 404) return null;
	if (!r.ok) throw new Error(`Could not load persona (${r.status})`);
	return (await r.json()) as FetchedPersona;
}

function buildUserPrompt(noteTitle: string, plain: string): string {
	const title = noteTitle.trim() || "Untitled";
	const trimmed = plain.trim();
	const body =
		trimmed.length > MAX_NOTE_PLAIN_CHARS
			? `${trimmed.slice(0, MAX_NOTE_PLAIN_CHARS)}\n\n[…truncated for model context; the note is longer.]`
			: trimmed;

	if (!body) {
		return [
			`The user asked to summarize a note titled "${title}", but the note body has no extractable text yet.`,
			`Reply in one or two short sentences: explain that there is nothing to summarize yet and suggest they write some content first.`,
		].join("\n");
	}

	return [
		`Summarize the following user note from their Divinotes workspace.`,
		``,
		`**Title:** ${title}`,
		``,
		`**Body (plain text extracted from the editor):**`,
		body,
		``,
		`Respond in Markdown. Prefer a brief opener, then bullet takeaways when the content supports it; otherwise a tight paragraph.`,
		`Preserve important names, numbers, and dates from the source. Do not invent facts.`,
	].join("\n");
}

/**
 * Runs local WebLLM chat with the given persona against the note plain text.
 * Call only in the browser after WebGPU checks.
 */
export async function summarizeNoteWithPersona(options: {
	persona: FetchedPersona;
	noteTitle: string;
	plainText: string;
	signal?: AbortSignal;
	onModelProgress?: (report: InitProgressReport) => void;
	onToken?: (delta: string, fullSoFar: string) => void;
}): Promise<string> {
	if (options.signal?.aborted) {
		throw new DOMException("Aborted", "AbortError");
	}

	await ensureInferenceModelLoaded({ onProgress: options.onModelProgress });

	const client = getInferenceClient();
	if (!client) throw new Error("Local AI is not available in this environment.");

	const cfg = options.persona.config ?? {};
	const maxTokens =
		typeof cfg.suggestedMaxTokens === "number" ? Math.min(cfg.suggestedMaxTokens, 2048) : 900;
	const temperature =
		typeof cfg.suggestedTemperature === "number" ? cfg.suggestedTemperature : 0.35;

	const userContent = buildUserPrompt(options.noteTitle, options.plainText);
	let out = "";

	for await (const chunk of client.generateCompletion({
		mode: "chat",
		messages: [
			{ role: "system", content: options.persona.systemPrompt },
			{ role: "user", content: userContent },
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
		options.onToken?.(chunk, out);
	}

	return out.trim();
}
