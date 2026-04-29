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
			description: "Concise summaries of note content for previews and digests.",
			systemPrompt: [
				"You summarize the user's note text clearly and faithfully.",
				"Use short paragraphs or bullets; do not invent facts not present in the note.",
				"If the note is empty, say so briefly.",
			].join("\n"),
			capabilityTags: ["summarization", "general"],
			config: { suggestedTemperature: 0.35, suggestedMaxTokens: 900 },
			sortOrder: 10,
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
