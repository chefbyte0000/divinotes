import type { InitProgressReport } from "@mlc-ai/web-llm";
import { ensureInferenceModelLoaded, getInferenceClient } from "$lib/ai/inference-bootstrap";
import { buildEffectiveSystemPrompt } from "$lib/ai/persona-system-prompt";
import { fetchActivePersonaBySlug, type FetchedPersona } from "$lib/ai/note-summarize";
import type { AiPersonaConfig } from "$lib/types/ai-persona";

/**
 * Single-note organize must NOT use `workspace-note-organizer`: that persona injects
 * strict JSON + workspace plan schema via `buildEffectiveSystemPrompt`, which makes
 * local models emit themes/assignments JSON instead of Markdown note bodies.
 */
const NOTE_ORGANIZE_PERSONA_SLUG = "workspace-assistant";
const MAX_NOTE_PLAIN_CHARS = 45_000;

const SINGLE_NOTE_MODE = [
	"SINGLE-NOTE MODE for this entire conversation turn:",
	"You are helping with exactly one note (title + body in the user message).",
	"Never emit workspace-scale JSON: no summary/themes/assignments objects, no noteIds, no kanban fields.",
].join("\n");

const QUESTIONS_TAIL = [
	"When the user asks for JSON with a top-level \"questions\" array, reply with ONLY that JSON object (valid JSON, no markdown fences, no prose before or after).",
	"Each question helps decide how to restructure that one note (tone, shape, level of detail)—not how to file multiple notes.",
].join("\n");

const ORGANIZE_TAIL = [
	"Output rules for this turn:",
	"Reply with ONLY the reorganized note as Markdown (GFM): headings (#/##), bullets, numbered steps, - [ ] tasks where appropriate.",
	"Preserve facts and intent from the original; you may reorder, group, de-duplicate, and add brief bridging sentences—do not invent requirements or citations.",
	"If the content is a loose todo dump, prefer a clear checklist or light plan-of-action sections guided by the user's clarification answers.",
	"Start with a # or ## heading or a paragraph—no preamble like \"Here is\".",
	"Never wrap the whole answer in ```json. Never output JSON objects for this step.",
].join("\n");

export type OrganizeNoteQuestionOption = {
	id: string;
	label: string;
	suggested?: boolean;
};

export type OrganizeNoteQuestion = {
	id: string;
	prompt: string;
	options: OrganizeNoteQuestionOption[];
};

export type OrganizeNoteAnswer = {
	questionId: string;
	answer: string;
};

function extractJsonObject(raw: string): string | null {
	let s = raw.trim();
	const fence = /^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/im.exec(s);
	if (fence) s = fence[1].trim();
	const start = s.indexOf("{");
	const end = s.lastIndexOf("}");
	if (start === -1 || end <= start) return null;
	return s.slice(start, end + 1);
}

function stripOuterCodeFence(raw: string): string {
	const s = raw.trim();
	const m = /^```(?:json|markdown|md)?\s*\n?([\s\S]*?)\n?```\s*$/im.exec(s);
	return m ? m[1].trim() : s;
}

function looksLikeWorkspacePlanJson(s: string): boolean {
	const t = s.trim();
	if (!t.startsWith("{")) return false;
	return /"assignments"\s*:/.test(t) && /"themes"\s*:/.test(t);
}

/** Unwrap accidental fences and reject workspace-plan JSON mistaken for note body. */
function normalizeOrganizedMarkdownOutput(raw: string): string {
	let s = raw.trim();
	for (let i = 0; i < 3; i++) {
		const next = stripOuterCodeFence(s);
		if (next === s) break;
		s = next;
	}
	if (looksLikeWorkspacePlanJson(s)) {
		throw new Error(
			"The model returned a workspace JSON plan instead of note Markdown. Try Organize again or switch the local model in settings.",
		);
	}
	return s.trim();
}

function personaConfigWithoutStrictJson(config: AiPersonaConfig | undefined): AiPersonaConfig {
	return {
		...(config ?? {}),
		strictJsonOutput: false,
		jsonOutputSpecification: undefined,
	};
}

function buildEffectiveSystemForNoteStep(persona: FetchedPersona, step: "questions" | "organize"): string {
	const base = buildEffectiveSystemPrompt(persona.systemPrompt, personaConfigWithoutStrictJson(persona.config));
	const tail = step === "questions" ? QUESTIONS_TAIL : ORGANIZE_TAIL;
	return [SINGLE_NOTE_MODE, "", "---", "", base, "", "---", "", tail].join("\n");
}

async function getNoteOrganizePersona(): Promise<FetchedPersona> {
	let persona: FetchedPersona | null = null;
	try {
		persona = await fetchActivePersonaBySlug(NOTE_ORGANIZE_PERSONA_SLUG);
	} catch {
		throw new Error("Could not load persona for note organize.");
	}
	if (!persona) {
		throw new Error(
			"The workspace-assistant persona is missing. Install starter personas (Admin → AI personas) or activate that slug.",
		);
	}
	return persona;
}

function buildQuestionPrompt(noteTitle: string, plainText: string): string {
	const trimmed = plainText.trim();
	const body =
		trimmed.length > MAX_NOTE_PLAIN_CHARS
			? `${trimmed.slice(0, MAX_NOTE_PLAIN_CHARS)}\n\n[…truncated for model context; the note is longer.]`
			: trimmed;
	return [
		"Read this ONE note. Infer what the user is trying to do (capture, plan, reference, draft, list, etc.).",
		"Generate exactly 3 clarification questions that will guide how to reorganize THIS note’s Markdown (structure, emphasis, and level of detail).",
		"Each question must have exactly 3 short answer options. Mark exactly one option as suggested=true.",
		"Question prompts: one short sentence each. Option labels: 2–6 words, like UI buttons.",
		"",
		"Return JSON only (no markdown fences):",
		'{ "questions":[{"id":"q1","prompt":"...","options":[{"id":"a","label":"...","suggested":true},{"id":"b","label":"..."},{"id":"c","label":"..."}]}] }',
		"",
		`Title: ${noteTitle.trim() || "Untitled"}`,
		"Note body:",
		body || "(empty)",
	].join("\n");
}

function parseQuestions(raw: string): OrganizeNoteQuestion[] {
	const json = extractJsonObject(raw);
	if (!json) return [];
	let parsed: unknown;
	try {
		parsed = JSON.parse(json);
	} catch {
		return [];
	}
	if (parsed === null || typeof parsed !== "object") return [];
	const root = parsed as { questions?: unknown };
	if (!Array.isArray(root.questions)) return [];
	const out: OrganizeNoteQuestion[] = [];
	for (const q of root.questions) {
		if (!q || typeof q !== "object") continue;
		const qr = q as Record<string, unknown>;
		const id = typeof qr.id === "string" ? qr.id.trim() : "";
		const prompt = typeof qr.prompt === "string" ? qr.prompt.trim() : "";
		if (!id || !prompt) continue;
		const optsRaw = Array.isArray(qr.options) ? qr.options : [];
		const options: OrganizeNoteQuestionOption[] = [];
		for (const o of optsRaw) {
			if (!o || typeof o !== "object") continue;
			const or = o as Record<string, unknown>;
			const oid = typeof or.id === "string" ? or.id.trim() : "";
			const label = typeof or.label === "string" ? or.label.trim() : "";
			if (!oid || !label) continue;
			options.push({ id: oid, label, suggested: Boolean(or.suggested) });
		}
		if (options.length < 2) continue;
		if (!options.some((o) => o.suggested)) options[0] = { ...options[0], suggested: true };
		out.push({ id, prompt, options: options.slice(0, 3) });
	}
	return out.slice(0, 3);
}

function buildOrganizePrompt(noteTitle: string, plainText: string, answers: OrganizeNoteAnswer[]): string {
	const trimmed = plainText.trim();
	const body =
		trimmed.length > MAX_NOTE_PLAIN_CHARS
			? `${trimmed.slice(0, MAX_NOTE_PLAIN_CHARS)}\n\n[…truncated for model context; the note is longer.]`
			: trimmed;
	const answerLines = answers
		.map((a) => `- ${a.questionId}: ${a.answer.trim()}`)
		.filter((x) => x.trim().length > 3)
		.join("\n");
	return [
		"Rewrite the following single note for clarity and flow. Keep the same subject matter and facts.",
		"Use the clarification answers to choose tone, structure, and how actionable vs reference-oriented the result should be.",
		"Prefer: clear headings, grouped bullets, numbered steps when sequential, and - [ ] checkboxes when the source is tasks or todos.",
		"Do not change the topic to a meta description of the note. Do not output JSON, YAML, or workspace plans.",
		"",
		`Title: ${noteTitle.trim() || "Untitled"}`,
		"",
		"Clarification answers:",
		answerLines || "(none)",
		"",
		"Original note (plain text):",
		body || "(empty)",
		"",
		"Produce the full reorganized note in Markdown only.",
	].join("\n");
}

async function runModel(options: {
	systemContent: string;
	userContent: string;
	signal?: AbortSignal;
	onModelProgress?: (report: InitProgressReport) => void;
	onToken?: (delta: string, fullSoFar: string) => void;
	maxTokens: number;
	temperature: number;
}): Promise<string> {
	await ensureInferenceModelLoaded({ onProgress: options.onModelProgress });
	const client = getInferenceClient();
	if (!client) throw new Error("Local AI is unavailable.");
	let out = "";
	for await (const chunk of client.generateCompletion({
		mode: "chat",
		messages: [
			{ role: "system", content: options.systemContent },
			{ role: "user", content: options.userContent },
		],
		stream: true,
		temperature: options.temperature,
		max_tokens: options.maxTokens,
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

export async function generateNoteOrganizeQuestions(options: {
	noteTitle: string;
	plainText: string;
	signal?: AbortSignal;
	onModelProgress?: (report: InitProgressReport) => void;
}): Promise<OrganizeNoteQuestion[]> {
	const persona = await getNoteOrganizePersona();
	const systemContent = buildEffectiveSystemForNoteStep(persona, "questions");
	const out = await runModel({
		systemContent,
		userContent: buildQuestionPrompt(options.noteTitle, options.plainText),
		signal: options.signal,
		onModelProgress: options.onModelProgress,
		maxTokens: 900,
		temperature: 0.28,
	});
	const parsed = parseQuestions(out);
	if (parsed.length > 0) return parsed;
	return [
		{
			id: "goal",
			prompt: "What should this note optimize for?",
			options: [
				{ id: "action", label: "Action plan", suggested: true },
				{ id: "clarity", label: "Clarity first" },
				{ id: "reference", label: "Long-term reference" },
			],
		},
	];
}

export async function organizeNoteWithAnswers(options: {
	noteTitle: string;
	plainText: string;
	answers: OrganizeNoteAnswer[];
	signal?: AbortSignal;
	onModelProgress?: (report: InitProgressReport) => void;
	onToken?: (delta: string, fullSoFar: string) => void;
}): Promise<string> {
	const persona = await getNoteOrganizePersona();
	const systemContent = buildEffectiveSystemForNoteStep(persona, "organize");
	const raw = await runModel({
		systemContent,
		userContent: buildOrganizePrompt(options.noteTitle, options.plainText, options.answers),
		signal: options.signal,
		onModelProgress: options.onModelProgress,
		onToken: options.onToken,
		maxTokens: 2200,
		temperature: 0.2,
	});
	return normalizeOrganizedMarkdownOutput(raw);
}
