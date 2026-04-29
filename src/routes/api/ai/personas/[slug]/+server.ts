import { error, json, type RequestHandler } from "@sveltejs/kit";
import { getActiveAiPersonaBySlug } from "$lib/server/ai-personas-service";

/** Active persona by slug for authenticated features (local AI, etc.). */
export const GET: RequestHandler = async ({ locals, params }) => {
	const session = await locals.auth();
	if (!session?.user?.id) error(401, "Unauthorized");

	const slug = params.slug?.trim();
	if (!slug) error(400, "Missing slug");

	const row = await getActiveAiPersonaBySlug(slug);
	if (!row) error(404, "Persona not found or inactive");

	return json({
		slug: row.slug,
		name: row.name,
		description: row.description,
		systemPrompt: row.systemPrompt,
		capabilityTags: row.capabilityTags ?? [],
		config: row.config ?? {},
	});
};
