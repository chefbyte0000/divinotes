import { json, error } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import { projects as projectsTable, smartLists as smartListsTable } from "$lib/server/db/schema";
import { and, eq } from "drizzle-orm";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) error(401, "Unauthorized");

	const body = (await request.json()) as { projectId?: string | null; title?: string };
	const projectId = body.projectId ?? null;
	const title = typeof body.title === "string" ? body.title.trim() : "";

	if (projectId) {
		const [p] = await db
			.select()
			.from(projectsTable)
			.where(and(eq(projectsTable.id, projectId), eq(projectsTable.ownerId, session.user.id)))
			.limit(1);
		if (!p) error(400, "Invalid project");
	}

	const [created] = await db
		.insert(smartListsTable)
		.values({
			ownerId: session.user.id,
			projectId,
			title: title || "Untitled list",
			items: [],
			metadata: { view: "checklist" },
		})
		.returning({ id: smartListsTable.id });

	if (!created) error(500, "Could not create list");

	return json({ id: created.id });
};
