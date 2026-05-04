import type { InitProgressReport } from "@mlc-ai/web-llm";
import {
	ensureInferenceModelLoaded,
	getInferenceClient,
} from "$lib/ai/inference-bootstrap";
import { buildEffectiveSystemPrompt } from "$lib/ai/persona-system-prompt";
import { fetchActivePersonaBySlug, type FetchedPersona } from "$lib/ai/note-summarize";
import {
	DEFAULT_KANBAN_STATUSES,
	normalizeKanbanStatus,
	type DefaultKanbanStatus,
} from "$lib/project/kanban-status";
import { sanitizeTagList } from "$lib/notes/note-tags";
import type { ProjectNoteMetadata, ProjectNoteRow } from "$lib/types/project-notes";

export const WORKSPACE_NOTE_ORGANIZER_SLUG = "workspace-note-organizer";

export type OrganizeContextNote = {
	id: string;
	title: string;
	description: string;
	metadata: ProjectNoteMetadata;
	bodyExcerpt: string;
};

export type OrganizeNotesContextResponse = {
	project: { id: string; name: string; description: string };
	notes: OrganizeContextNote[];
	truncated: boolean;
	maxNotes: number;
};

export type OrganizePlanTheme = { title: string; noteIds: string[] };

export type OrganizePlanAssignment = {
	noteId: string;
	status: DefaultKanbanStatus;
	priority: number;
	tags: string[];
	sortRank: number;
};

export type OrganizePlan = {
	summary: string;
	themes: OrganizePlanTheme[];
	assignments: OrganizePlanAssignment[];
};

export type OrganizeClarificationQuestionOption = {
	id: string;
	label: string;
	suggested?: boolean;
};

export type OrganizeClarificationQuestion = {
	id: string;
	prompt: string;
	options: OrganizeClarificationQuestionOption[];
};

export type OrganizeClarificationAnswer = {
	questionId: string;
	answer: string;
};

type OrganizeClarificationQuestionEnvelope = {
	questions: OrganizeClarificationQuestion[];
};

export type OrganizeNotePatch = {
	noteId: string;
	metadata: Partial<ProjectNoteMetadata>;
	hasChanges: boolean;
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

function isKanbanStatus(s: string): s is DefaultKanbanStatus {
	return (DEFAULT_KANBAN_STATUSES as readonly string[]).includes(s);
}

function clampInt(n: unknown, min: number, max: number, fallback: number): number {
	if (typeof n !== "number" || !Number.isFinite(n)) return fallback;
	return Math.min(max, Math.max(min, Math.round(n)));
}

function normalizeOrganizePlan(
	data: unknown,
	validIds: Set<string>,
	catalog: OrganizeContextNote[],
): OrganizePlan | null {
	if (data === null || typeof data !== "object") return null;
	const root = data as Record<string, unknown>;

	const summary = typeof root.summary === "string" ? root.summary.trim() : "";
	if (!summary) return null;

	const themesRaw = root.themes;
	const themes: OrganizePlanTheme[] = [];
	if (Array.isArray(themesRaw)) {
		for (const t of themesRaw) {
			if (t === null || typeof t !== "object") continue;
			const tr = t as Record<string, unknown>;
			const title = typeof tr.title === "string" ? tr.title.trim() : "";
			const idsRaw = tr.noteIds;
			const noteIds: string[] = [];
			if (Array.isArray(idsRaw)) {
				for (const id of idsRaw) {
					if (typeof id === "string" && validIds.has(id)) noteIds.push(id);
				}
			}
			if (title && noteIds.length > 0) themes.push({ title, noteIds });
		}
	}

	const assignmentsRaw = root.assignments;
	if (!Array.isArray(assignmentsRaw)) return null;

	const byId = new Map<string, OrganizePlanAssignment>();

	for (const item of assignmentsRaw) {
		if (item === null || typeof item !== "object") continue;
		const a = item as Record<string, unknown>;
		const noteId = typeof a.noteId === "string" ? a.noteId : "";
		if (!noteId || !validIds.has(noteId)) continue;

		let status: DefaultKanbanStatus = "To Do";
		if (typeof a.status === "string" && isKanbanStatus(a.status)) status = a.status;
		else if (typeof a.status === "string") status = normalizeKanbanStatus(a.status);

		const priority = clampInt(a.priority, 1, 5, 3);

		let tags: string[] = [];
		if (Array.isArray(a.tags)) {
			const raw = a.tags.filter((x): x is string => typeof x === "string");
			tags = sanitizeTagList(raw);
		}

		const sortRank =
			typeof a.sortRank === "number" && Number.isFinite(a.sortRank) && a.sortRank >= 1
				? Math.floor(a.sortRank)
				: 1;

		byId.set(noteId, { noteId, status, priority, tags, sortRank });
	}

	const catById = new Map(catalog.map((n) => [n.id, n]));
	for (const id of validIds) {
		if (byId.has(id)) continue;
		const note = catById.get(id);
		if (note) {
			const pr =
				typeof note.metadata?.priority === "number" && !Number.isNaN(note.metadata.priority)
					? clampInt(note.metadata.priority, 1, 5, 3)
					: 3;
			byId.set(id, {
				noteId: id,
				status: normalizeKanbanStatus(note.metadata?.status),
				priority: pr,
				tags: sanitizeTagList(note.metadata?.tags ?? []),
				sortRank: 1_000_000,
			});
		} else {
			byId.set(id, {
				noteId: id,
				status: "To Do",
				priority: 3,
				tags: [],
				sortRank: 1_000_000,
			});
		}
	}

	const assignments = [...byId.values()].sort((x, y) => {
		if (x.sortRank !== y.sortRank) return x.sortRank - y.sortRank;
		return x.noteId.localeCompare(y.noteId);
	});

	for (let i = 0; i < assignments.length; i++) {
		assignments[i] = { ...assignments[i], sortRank: i + 1 };
	}

	return { summary, themes, assignments };
}

function parseOrganizePlanFromModelOutput(
	raw: string,
	validIds: Set<string>,
	catalog: OrganizeContextNote[],
): OrganizePlan | null {
	const json = extractJsonObject(raw);
	if (!json) return null;
	let parsed: unknown;
	try {
		parsed = JSON.parse(json);
	} catch {
		return null;
	}
	return normalizeOrganizePlan(parsed, validIds, catalog);
}

function normalizeClarificationQuestions(data: unknown): OrganizeClarificationQuestion[] {
	if (data === null || typeof data !== "object") return [];
	const root = data as Partial<OrganizeClarificationQuestionEnvelope>;
	if (!Array.isArray(root.questions)) return [];
	const out: OrganizeClarificationQuestion[] = [];
	const seenQuestionIds = new Set<string>();

	for (const q of root.questions) {
		if (q === null || typeof q !== "object") continue;
		const qr = q as Record<string, unknown>;
		const id = typeof qr.id === "string" ? qr.id.trim() : "";
		const prompt = typeof qr.prompt === "string" ? qr.prompt.trim() : "";
		if (!id || !prompt || seenQuestionIds.has(id)) continue;

		const optsRaw = Array.isArray(qr.options) ? qr.options : [];
		const options: OrganizeClarificationQuestionOption[] = [];
		const seenOptionIds = new Set<string>();
		for (const o of optsRaw) {
			if (o === null || typeof o !== "object") continue;
			const or = o as Record<string, unknown>;
			const optionId = typeof or.id === "string" ? or.id.trim() : "";
			const label = typeof or.label === "string" ? or.label.trim() : "";
			if (!optionId || !label || seenOptionIds.has(optionId)) continue;
			seenOptionIds.add(optionId);
			options.push({
				id: optionId,
				label,
				suggested: Boolean(or.suggested),
			});
		}
		if (options.length < 2) continue;
		if (!options.some((o) => o.suggested)) {
			options[0] = { ...options[0], suggested: true };
		}
		seenQuestionIds.add(id);
		out.push({ id, prompt, options: options.slice(0, 5) });
		if (out.length >= 4) break;
	}

	return out;
}

function parseClarificationQuestionsFromModelOutput(raw: string): OrganizeClarificationQuestion[] {
	const json = extractJsonObject(raw);
	if (!json) return [];
	let parsed: unknown;
	try {
		parsed = JSON.parse(json);
	} catch {
		return [];
	}
	return normalizeClarificationQuestions(parsed);
}

export async function fetchOrganizeNotesContext(projectId: string): Promise<OrganizeNotesContextResponse> {
	const r = await fetch(`/api/projects/${encodeURIComponent(projectId)}/organize-notes-context`);
	if (r.status === 404) throw new Error("Project not found.");
	if (!r.ok) throw new Error(`Could not load notes for organizing (${r.status}).`);
	return (await r.json()) as OrganizeNotesContextResponse;
}

function buildCatalogPrompt(
	ctx: OrganizeNotesContextResponse,
	clarifications?: OrganizeClarificationAnswer[],
): string {
	const lines: string[] = [
		`Reorganize this project's notes for clearer structure, kanban flow, and discovery.`,
		``,
		`## Project`,
		`Name: ${ctx.project.name.trim() || "(unnamed)"}`,
		`Description: ${(ctx.project.description ?? "").trim() || "(none)"}`,
		``,
	];

	if (ctx.truncated) {
		lines.push(
			`Note: Only the ${ctx.maxNotes} most recently updated notes are included (this project has more).`,
			``,
		);
	}

	if (clarifications) {
		const cleaned = clarifications
			.map((a) => ({ questionId: a.questionId.trim(), answer: a.answer.trim() }))
			.filter((a) => a.questionId && a.answer);
		if (cleaned.length > 0) {
			lines.push(`## User clarification answers for this run`);
			for (const a of cleaned) {
				lines.push(`- ${a.questionId}: ${a.answer}`);
			}
			lines.push(
				`Adapt statuses, priorities, tags, and ordering to these preferences while keeping assignments realistic.`,
			);
			lines.push(``);
		}
	}

	lines.push(`## Note catalog (use these exact noteId UUIDs only)`, ``);

	for (const n of ctx.notes) {
		const title = n.title.trim() || "Untitled note";
		const desc = (n.description ?? "").trim();
		const st = normalizeKanbanStatus(n.metadata?.status);
		const pr =
			typeof n.metadata?.priority === "number" && !Number.isNaN(n.metadata.priority)
				? String(n.metadata.priority)
				: "";
		const tags = (n.metadata?.tags ?? []).join(", ") || "(none)";
		const excerpt = (n.bodyExcerpt ?? "").trim() || "(empty)";

		lines.push(`### ${n.id}`);
		lines.push(`Title: ${title}`);
		if (desc) lines.push(`Card description: ${desc}`);
		lines.push(`Current kanban status: ${st}`);
		if (pr) lines.push(`Current priority (1–5): ${pr}`);
		lines.push(`Current tags: ${tags}`);
		lines.push(`Body excerpt:`);
		lines.push(excerpt);
		lines.push(`---`, ``);
	}

	lines.push(
		`Return JSON only as specified in your system instructions. Cover every catalog note exactly once in "assignments".`,
	);

	return lines.join("\n");
}

function buildClarificationQuestionPrompt(ctx: OrganizeNotesContextResponse): string {
	const lines: string[] = [
		`You are preparing a note-organization run for one project.`,
		`Generate concise clarification questions that help personalize organization outcomes before planning.`,
		``,
		`Project: ${ctx.project.name.trim() || "(unnamed)"}`,
		`Description: ${(ctx.project.description ?? "").trim() || "(none)"}`,
		`Notes in context: ${ctx.notes.length}`,
		``,
		`Create 3-4 questions. Each question must include 3-4 options.`,
		`Mark exactly one option as suggested (best default) using suggested=true.`,
		`Options should be practical and mutually distinct.`,
		``,
		`Output strict JSON only in this shape:`,
		`{`,
		`  "questions": [`,
		`    {`,
		`      "id": "short-kebab-id",`,
		`      "prompt": "Question text?",`,
		`      "options": [`,
		`        { "id": "opt-id", "label": "Option label", "suggested": true }`,
		`      ]`,
		`    }`,
		`  ]`,
		`}`,
	];
	return lines.join("\n");
}

/**
 * Loads project note excerpts, runs the workspace-note-organizer persona locally, and returns a validated plan.
 */
export async function generateWorkspaceOrganizePlan(options: {
	projectId: string;
	clarifications?: OrganizeClarificationAnswer[];
	signal?: AbortSignal;
	onModelProgress?: (report: InitProgressReport) => void;
}): Promise<{ ctx: OrganizeNotesContextResponse; plan: OrganizePlan; rawModelText: string }> {
	const ctx = await fetchOrganizeNotesContext(options.projectId);
	if (ctx.notes.length === 0) {
		throw new Error("This project has no notes to organize yet.");
	}

	let persona: FetchedPersona | null = null;
	try {
		persona = await fetchActivePersonaBySlug(WORKSPACE_NOTE_ORGANIZER_SLUG);
	} catch {
		throw new Error("Could not load the workspace organizer persona.");
	}
	if (!persona) {
		throw new Error(
			"The workspace-note-organizer persona is missing. Ask an admin to install starter personas under Admin → AI personas.",
		);
	}

	const validIds = new Set(ctx.notes.map((n) => n.id));
	const userContent = buildCatalogPrompt(ctx, options.clarifications);
	const systemContent = buildEffectiveSystemPrompt(persona.systemPrompt, persona.config);

	await ensureInferenceModelLoaded({ onProgress: options.onModelProgress });
	const client = getInferenceClient();
	if (!client) throw new Error("Local AI is unavailable.");

	const cfg = persona.config ?? {};
	const maxTokens =
		typeof cfg.suggestedMaxTokens === "number" ? Math.min(cfg.suggestedMaxTokens, 4096) : 2800;
	const temperature =
		typeof cfg.suggestedTemperature === "number" ? cfg.suggestedTemperature : 0.22;

	let out = "";
	for await (const chunk of client.generateCompletion({
		mode: "chat",
		messages: [
			{ role: "system", content: systemContent },
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
	}

	const plan = parseOrganizePlanFromModelOutput(out, validIds, ctx.notes);
	if (!plan) {
		throw new Error(
			"The model did not return valid JSON for a workspace plan. Try again, or shorten notes / reduce note count.",
		);
	}

	return { ctx, plan, rawModelText: out.trim() };
}

export async function generateWorkspaceOrganizeClarificationQuestions(options: {
	projectId: string;
	signal?: AbortSignal;
	onModelProgress?: (report: InitProgressReport) => void;
}): Promise<{ ctx: OrganizeNotesContextResponse; questions: OrganizeClarificationQuestion[] }> {
	const ctx = await fetchOrganizeNotesContext(options.projectId);
	if (ctx.notes.length === 0) {
		throw new Error("This project has no notes to organize yet.");
	}

	let persona: FetchedPersona | null = null;
	try {
		persona = await fetchActivePersonaBySlug(WORKSPACE_NOTE_ORGANIZER_SLUG);
	} catch {
		throw new Error("Could not load the workspace organizer persona.");
	}
	if (!persona) {
		throw new Error(
			"The workspace-note-organizer persona is missing. Ask an admin to install starter personas under Admin → AI personas.",
		);
	}

	await ensureInferenceModelLoaded({ onProgress: options.onModelProgress });
	const client = getInferenceClient();
	if (!client) throw new Error("Local AI is unavailable.");

	const cfg = persona.config ?? {};
	const systemContent = buildEffectiveSystemPrompt(persona.systemPrompt, persona.config);
	const userContent = buildClarificationQuestionPrompt(ctx);
	const maxTokens =
		typeof cfg.suggestedMaxTokens === "number" ? Math.min(cfg.suggestedMaxTokens, 2400) : 900;
	const temperature =
		typeof cfg.suggestedTemperature === "number" ? Math.max(0.1, cfg.suggestedTemperature) : 0.28;

	let out = "";
	for await (const chunk of client.generateCompletion({
		mode: "chat",
		messages: [
			{ role: "system", content: systemContent },
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
	}

	let questions = parseClarificationQuestionsFromModelOutput(out);
	if (questions.length === 0) {
		questions = [
			{
				id: "main-goal",
				prompt: "What should this organization optimize first?",
				options: [
					{ id: "execute", label: "Faster execution and next actions", suggested: true },
					{ id: "cleanup", label: "Metadata consistency and cleanup" },
					{ id: "ship", label: "Shipping milestones and delivery" },
				],
			},
		];
	}

	return { ctx, questions };
}

function tagsEqual(a: string[] | undefined, b: string[]): boolean {
	const x = sanitizeTagList(a ?? []);
	const y = sanitizeTagList(b);
	if (x.length !== y.length) return false;
	for (let i = 0; i < x.length; i++) {
		if (x[i] !== y[i]) return false;
	}
	return true;
}

/** Diffs model assignments against current rows for PATCH metadata. */
export function buildOrganizePatches(
	rows: ProjectNoteRow[],
	assignments: OrganizePlanAssignment[],
): OrganizeNotePatch[] {
	const map = new Map(assignments.map((a) => [a.noteId, a]));
	const out: OrganizeNotePatch[] = [];

	for (const row of rows) {
		const a = map.get(row.id);
		if (!a) continue;

		const meta: Partial<ProjectNoteMetadata> = {};
		let hasChanges = false;

		const nextStatus = a.status;
		if (normalizeKanbanStatus(row.metadata?.status) !== nextStatus) {
			meta.status = nextStatus;
			hasChanges = true;
		}

		const curPr =
			typeof row.metadata?.priority === "number" && !Number.isNaN(row.metadata.priority)
				? row.metadata.priority
				: null;
		if (curPr !== a.priority) {
			meta.priority = a.priority;
			hasChanges = true;
		}

		if (a.tags.length > 0 && !tagsEqual(row.metadata?.tags, a.tags)) {
			meta.tags = a.tags;
			hasChanges = true;
		}

		const curRank =
			typeof row.metadata?.sortRank === "number" && !Number.isNaN(row.metadata.sortRank)
				? row.metadata.sortRank
				: null;
		if (curRank !== a.sortRank) {
			meta.sortRank = a.sortRank;
			hasChanges = true;
		}

		out.push({ noteId: row.id, metadata: meta, hasChanges });
	}

	return out;
}

/** Applies partial metadata updates; the API merges with existing note metadata. */
export async function applyOrganizePatches(patches: OrganizeNotePatch[], signal?: AbortSignal): Promise<void> {
	for (const p of patches) {
		if (!p.hasChanges) continue;
		if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

		const r = await fetch(`/api/notes/${encodeURIComponent(p.noteId)}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ metadata: p.metadata }),
			signal,
		});
		if (!r.ok) throw new Error(`Failed to update note ${p.noteId} (${r.status}).`);
	}
}
