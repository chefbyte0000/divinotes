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
