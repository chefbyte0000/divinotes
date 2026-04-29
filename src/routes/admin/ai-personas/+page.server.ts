import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import type { AiPersonaConfig } from "$lib/types/ai-persona";
import {
	createAiPersona,
	deleteAiPersona,
	normalizeSlug,
	parseCapabilityTags,
	parseConfigJson,
	seedStarterAiPersonas,
	SLUG_PATTERN,
	updateAiPersona,
	listAiPersonas,
} from "$lib/server/ai-personas-service";

function mergeConfigFromForm(
	fd: FormData,
	configRaw: string,
): { ok: true; value: AiPersonaConfig } | { ok: false; error: string } {
	const parsed = parseConfigJson(configRaw);
	if (!parsed.ok) return parsed;
	const strictJson = fd.get("strictJsonOutput") === "on";
	const spec = String(fd.get("jsonOutputSpecification") ?? "").trim();
	const merged: AiPersonaConfig = { ...parsed.value };
	delete merged.strictJsonOutput;
	delete merged.jsonOutputSpecification;
	merged.strictJsonOutput = strictJson;
	if (spec) merged.jsonOutputSpecification = spec;
	return { ok: true, value: merged };
}

export const load: PageServerLoad = async () => {
	const personas = await listAiPersonas();
	return {
		personas: personas.map((p) => ({
			id: p.id,
			slug: p.slug,
			name: p.name,
			description: p.description,
			systemPrompt: p.systemPrompt,
			capabilityTags: p.capabilityTags ?? [],
			config: p.config ?? {},
			sortOrder: p.sortOrder,
			isActive: p.isActive,
			createdAt: p.createdAt?.toISOString() ?? null,
			updatedAt: p.updatedAt?.toISOString() ?? null,
		})),
	};
};

export const actions: Actions = {
	createPersona: async ({ request }) => {
		const fd = await request.formData();
		const slug = normalizeSlug(String(fd.get("slug") ?? ""));
		const name = String(fd.get("name") ?? "").trim();
		const description = String(fd.get("description") ?? "").trim() || null;
		const systemPrompt = String(fd.get("systemPrompt") ?? "").trim();
		const tagsRaw = String(fd.get("capabilityTags") ?? "");
		const configRaw = String(fd.get("config") ?? "");
		const sortOrder = Number.parseInt(String(fd.get("sortOrder") ?? "0"), 10);
		const isActive = String(fd.get("isActive") ?? "true") === "true";

		if (!slug || !SLUG_PATTERN.test(slug)) {
			return fail(400, { error: "Slug must be lowercase letters, numbers, and single hyphens (e.g. note-summarizer)." });
		}
		if (!name) return fail(400, { error: "Name is required." });
		if (!systemPrompt) return fail(400, { error: "System prompt is required." });

		const cfg = mergeConfigFromForm(fd, configRaw);
		if (!cfg.ok) return fail(400, { error: cfg.error });

		try {
			await createAiPersona({
				slug,
				name,
				description,
				systemPrompt,
				capabilityTags: parseCapabilityTags(tagsRaw),
				config: cfg.value,
				sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
				isActive,
			});
			return { success: true };
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			if (/unique|duplicate/i.test(msg)) {
				return fail(400, { error: "That slug is already in use." });
			}
			console.error("createPersona", e);
			return fail(500, { error: "Could not create persona." });
		}
	},

	updatePersona: async ({ request }) => {
		const fd = await request.formData();
		const id = String(fd.get("id") ?? "");
		const slug = normalizeSlug(String(fd.get("slug") ?? ""));
		const name = String(fd.get("name") ?? "").trim();
		const description = String(fd.get("description") ?? "").trim() || null;
		const systemPrompt = String(fd.get("systemPrompt") ?? "").trim();
		const tagsRaw = String(fd.get("capabilityTags") ?? "");
		const configRaw = String(fd.get("config") ?? "");
		const sortOrder = Number.parseInt(String(fd.get("sortOrder") ?? "0"), 10);
		const isActive = String(fd.get("isActive") ?? "true") === "true";

		if (!id) return fail(400, { error: "Missing id." });
		if (!slug || !SLUG_PATTERN.test(slug)) {
			return fail(400, { error: "Slug must be lowercase letters, numbers, and single hyphens." });
		}
		if (!name) return fail(400, { error: "Name is required." });
		if (!systemPrompt) return fail(400, { error: "System prompt is required." });

		const cfg = mergeConfigFromForm(fd, configRaw);
		if (!cfg.ok) return fail(400, { error: cfg.error });

		try {
			const row = await updateAiPersona(id, {
				slug,
				name,
				description,
				systemPrompt,
				capabilityTags: parseCapabilityTags(tagsRaw),
				config: cfg.value,
				sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
				isActive,
			});
			if (!row) return fail(404, { error: "Persona not found." });
			return { success: true };
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			if (/unique|duplicate/i.test(msg)) {
				return fail(400, { error: "That slug is already in use." });
			}
			console.error("updatePersona", e);
			return fail(500, { error: "Could not update persona." });
		}
	},

	deletePersona: async ({ request }) => {
		const fd = await request.formData();
		const id = String(fd.get("id") ?? "");
		if (!id) return fail(400, { error: "Missing id." });
		try {
			await deleteAiPersona(id);
			return { success: true };
		} catch (e) {
			console.error("deletePersona", e);
			return fail(500, { error: "Could not delete persona." });
		}
	},

	seedStarters: async () => {
		try {
			const { inserted, skipped } = await seedStarterAiPersonas();
			return { success: true, seedInserted: inserted, seedSkipped: skipped };
		} catch (e) {
			console.error("seedStarters", e);
			return fail(500, { error: "Could not seed starter personas." });
		}
	},
};
