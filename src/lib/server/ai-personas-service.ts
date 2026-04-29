import { db } from "$lib/server/db";
import { aiPersonas, type AiPersona, type NewAiPersona } from "$lib/server/db/schema";
import type { AiPersonaConfig } from "$lib/types/ai-persona";
import { and, asc, eq, sql } from "drizzle-orm";

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeSlug(raw: string): string {
	return raw.trim().toLowerCase();
}

export function parseCapabilityTags(raw: string): string[] {
	return raw
		.split(/[,;\n]+/)
		.map((s) => s.trim().toLowerCase())
		.filter(Boolean);
}

export function parseConfigJson(raw: string): { ok: true; value: AiPersonaConfig } | { ok: false; error: string } {
	const trimmed = raw.trim();
	if (!trimmed) return { ok: true, value: {} };
	try {
		const parsed: unknown = JSON.parse(trimmed);
		if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
			return { ok: false, error: "Config must be a JSON object." };
		}
		return { ok: true, value: parsed as AiPersonaConfig };
	} catch {
		return { ok: false, error: "Invalid JSON in config." };
	}
}

export async function listAiPersonas(): Promise<AiPersona[]> {
	return db.select().from(aiPersonas).orderBy(asc(aiPersonas.sortOrder), asc(aiPersonas.name));
}

export async function getAiPersonaById(id: string): Promise<AiPersona | undefined> {
	const [row] = await db.select().from(aiPersonas).where(eq(aiPersonas.id, id)).limit(1);
	return row;
}

export async function getAiPersonaBySlug(slug: string): Promise<AiPersona | undefined> {
	const s = normalizeSlug(slug);
	const [row] = await db.select().from(aiPersonas).where(eq(aiPersonas.slug, s)).limit(1);
	return row;
}

export async function getActiveAiPersonaBySlug(slug: string): Promise<AiPersona | undefined> {
	const s = normalizeSlug(slug);
	const [row] = await db
		.select()
		.from(aiPersonas)
		.where(and(eq(aiPersonas.slug, s), eq(aiPersonas.isActive, true)))
		.limit(1);
	return row;
}

/** For feature modules (summarization, recipes, …): active personas tagged with `tag`. */
export async function listActiveAiPersonasByCapabilityTag(tag: string): Promise<AiPersona[]> {
	const t = tag.toLowerCase();
	return db
		.select()
		.from(aiPersonas)
		.where(
			and(
				eq(aiPersonas.isActive, true),
				sql`${aiPersonas.capabilityTags} @> ${JSON.stringify([t])}::jsonb`,
			),
		)
		.orderBy(asc(aiPersonas.sortOrder), asc(aiPersonas.name));
}

export async function createAiPersona(input: Omit<NewAiPersona, "id" | "createdAt" | "updatedAt">): Promise<AiPersona> {
	const [row] = await db
		.insert(aiPersonas)
		.values({
			...input,
			updatedAt: new Date(),
		})
		.returning();
	return row;
}

export async function updateAiPersona(
	id: string,
	patch: Partial<Omit<NewAiPersona, "id" | "createdAt">>,
): Promise<AiPersona | undefined> {
	const [row] = await db
		.update(aiPersonas)
		.set({
			...patch,
			updatedAt: new Date(),
		})
		.where(eq(aiPersonas.id, id))
		.returning();
	return row;
}

export async function deleteAiPersona(id: string): Promise<void> {
	await db.delete(aiPersonas).where(eq(aiPersonas.id, id));
}

export async function countAiPersonas(): Promise<number> {
	const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(aiPersonas);
	return r?.n ?? 0;
}

/** Idempotent starter rows for new environments — skips slugs that already exist. */
export async function seedStarterAiPersonas(): Promise<{ inserted: number; skipped: number }> {
	const starters: Omit<NewAiPersona, "id" | "createdAt" | "updatedAt">[] = [
		{
			slug: "note-summarizer",
			name: "Note summarizer",
			description: "Faithful summaries in short paragraphs or bullets; never invent facts.",
			systemPrompt: [
				"You summarize the user's note text clearly and faithfully.",
				"Use short paragraphs or bullets; do not invent facts not present in the note.",
				"If the note is empty, say so briefly.",
			].join("\n"),
			capabilityTags: ["summarization", "general"],
			config: { suggestedTemperature: 0.42, suggestedMaxTokens: 1400 },
			sortOrder: 10,
			isActive: true,
		},
		{
			slug: "note-description",
			name: "Note description",
			description: "One short paragraph for card previews and discovery.",
			systemPrompt: [
				"You write a dense 2–4 sentence plain-text description of a note's purpose and contents.",
				"No markdown; no bullet symbols; no leading “This note”.",
				"Stay grounded in the excerpt; flag uncertainty briefly if signals are weak.",
			].join("\n"),
			capabilityTags: ["writing", "general"],
			config: { suggestedTemperature: 0.38, suggestedMaxTokens: 320 },
			sortOrder: 11,
			isActive: true,
		},
		{
			slug: "note-auto-tags",
			name: "Note auto-tags",
			description: "Short topical tags for lists and search (JSON array output).",
			systemPrompt: [
				"You reply with ONLY a JSON array of short lowercase tags for the user's note.",
				"Each tag uses lowercase letters, digits, and hyphens only (e.g. \"api-design\", \"q3-planning\"); max 40 characters per tag.",
				"No prose, no markdown fences, no trailing commas — only JSON like [\"tag-one\",\"tag-two\"].",
				"Suggest 3–8 distinct tags grounded in the title and body; if there is nothing to tag, output [].",
			].join("\n"),
			capabilityTags: ["metadata", "general"],
			config: { suggestedTemperature: 0.25, suggestedMaxTokens: 256 },
			sortOrder: 12,
			isActive: true,
		},
		{
			slug: "note-title",
			name: "Note title",
			description: "Concise note title from the note body.",
			systemPrompt: [
				"You suggest a short, specific note title based on the content.",
				"Output a single line only: plain text, no quotes, no markdown, no trailing punctuation stack.",
				"Prefer 3–12 words; hard cap 90 characters; omit filler like “Notes on” or “Untitled”.",
				"If the body is empty, output exactly: Untitled note",
			].join("\n"),
			capabilityTags: ["writing", "general"],
			config: { suggestedTemperature: 0.32, suggestedMaxTokens: 120 },
			sortOrder: 13,
			isActive: true,
		},
		{
			slug: "workspace-note-organizer",
			name: "Workspace note organizer",
			description:
				"From local excerpts: kanban columns, priorities, topical tags, and narrative order across all notes in a project.",
			systemPrompt: [
				"You are a principal information architect for a single-user notes workspace.",
				"You receive ONE project and a catalog of notes (UUID id, titles, descriptions, current metadata, and short body excerpts).",
				"Design a coherent structure: workstreams (themes), reading order (sortRank), execution signal (kanban status + priority), and search-friendly tags.",
				"Kanban: use only these exact status strings: \"To Do\", \"Doing\", \"Done\". Map stubs and parked ideas to To Do; active drafting to Doing; polished, reference, or shipped summaries to Done.",
				"Priorities: integer 1–5 where 1 is the few highest-leverage items to unblock the project next, 5 is lowest urgency. Spread priorities — avoid marking everything priority 1.",
				"Tags: 4–8 distinct kebab-case tags per note (lowercase letters, digits, hyphens); reuse a stable thematic vocabulary across related notes.",
				"sortRank: assign a dense 1..N ordering (N = number of catalog notes) so reading top-to-bottom tells a sensible story (e.g. foundations → active work → reference).",
				"themes: 3–8 named groups; each catalog note id appears in at most one theme.noteIds — pick the strongest fit. Themes explain intent; assignments carry authoritative fields.",
				"Never invent UUIDs — use only ids from the catalog. Ground every assignment in the excerpts; if content is thin, use conservative tags and neutral priorities.",
			].join("\n"),
			capabilityTags: ["organization", "analysis", "metadata"],
			config: {
				suggestedTemperature: 0.2,
				suggestedMaxTokens: 3200,
				strictJsonOutput: true,
				jsonOutputSpecification: [
					"Return a single JSON object with exactly these keys:",
					'"summary": string, 2–5 sentences explaining the organizing logic.',
					'"themes": array of { "title": string (short), "noteIds": string[] } — noteIds must be from the catalog only.',
					'"assignments": array with exactly one entry per catalog note id. Each object:',
					'  "noteId": string (uuid from catalog),',
					'  "status": "To Do" | "Doing" | "Done",',
					'  "priority": integer 1–5,',
					'  "tags": string[] (kebab-case tokens),',
					'  "sortRank": integer 1..N (unique ascending).',
					"No other top-level keys. No markdown fences, no trailing commas.",
				].join("\n"),
			},
			sortOrder: 14,
			isActive: true,
		},
		{
			slug: "recipe-developer",
			name: "Recipe developer",
			description: "Structured cooking steps, substitutions, and shopping hints.",
			systemPrompt: [
				"You help the user develop and refine recipes.",
				"Prefer numbered steps, ingredient lists, and optional timing or temperature notes.",
				"Be explicit about yields and servings when relevant.",
			].join("\n"),
			capabilityTags: ["recipe", "writing"],
			config: { suggestedTemperature: 0.55, suggestedMaxTokens: 1200 },
			sortOrder: 20,
			isActive: true,
		},
		{
			slug: "workspace-assistant",
			name: "Workspace assistant",
			description: "General-purpose help inside the active project context.",
			systemPrompt: [
				"You assist inside a notes workspace: drafting, clarifying, and light restructuring.",
				"Stay grounded in what the user provides; flag uncertainty instead of guessing.",
				"Prefer concise, actionable answers.",
			].join("\n"),
			capabilityTags: ["general", "writing"],
			config: { suggestedTemperature: 0.6, suggestedMaxTokens: 1500 },
			sortOrder: 30,
			isActive: true,
		},
	];

	let inserted = 0;
	let skipped = 0;
	for (const row of starters) {
		const existing = await db.select({ id: aiPersonas.id }).from(aiPersonas).where(eq(aiPersonas.slug, row.slug)).limit(1);
		if (existing.length > 0) {
			skipped += 1;
			continue;
		}
		await db.insert(aiPersonas).values({
			...row,
			updatedAt: new Date(),
		});
		inserted += 1;
	}
	return { inserted, skipped };
}
