import { json, error } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import {
	notes as notesTable,
	projects as projectsTable,
} from "$lib/server/db/schema";
import { and, eq } from "drizzle-orm";
import type { RequestHandler } from "./$types";

/** Full note rows for client-side PDF/DOCX/Markdown stitching (no external generator). */
export const GET: RequestHandler = async ({ params, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) error(401, "Unauthorized");

	const projectId = params.projectId;
	const [project] = await db
		.select({ id: projectsTable.id })
		.from(projectsTable)
		.where(and(eq(projectsTable.id, projectId), eq(projectsTable.ownerId, session.user.id)))
		.limit(1);

	if (!project) error(404, "Project not found");

	const rows = await db
		.select({
			id: notesTable.id,
			title: notesTable.title,
			description: notesTable.description,
			body: notesTable.body,
			metadata: notesTable.metadata,
			createdAt: notesTable.createdAt,
			updatedAt: notesTable.updatedAt,
		})
		.from(notesTable)
		.where(and(eq(notesTable.ownerId, session.user.id), eq(notesTable.projectId, projectId)));

	return json({ notes: rows });
};
