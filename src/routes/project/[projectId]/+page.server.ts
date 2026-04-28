import { db } from "$lib/server/db";
import {
	notes as notesTable,
	projects as projectsTable,
	smartLists as smartListsTable,
} from "$lib/server/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { error, redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) throw redirect(303, "/login");

	const [project] = await db
		.select()
		.from(projectsTable)
		.where(and(eq(projectsTable.id, params.projectId), eq(projectsTable.ownerId, session.user.id)))
		.limit(1);

	if (!project) error(404, "Project not found");

	const projectNotes = await db
		.select({
			id: notesTable.id,
			title: notesTable.title,
			updatedAt: notesTable.updatedAt,
			metadata: notesTable.metadata,
		})
		.from(notesTable)
		.where(and(eq(notesTable.ownerId, session.user.id), eq(notesTable.projectId, params.projectId)))
		.orderBy(desc(notesTable.updatedAt));

	const projectSmartLists = await db
		.select({
			id: smartListsTable.id,
			title: smartListsTable.title,
			updatedAt: smartListsTable.updatedAt,
		})
		.from(smartListsTable)
		.where(
			and(eq(smartListsTable.ownerId, session.user.id), eq(smartListsTable.projectId, params.projectId)),
		)
		.orderBy(desc(smartListsTable.updatedAt));

	return { project, projectNotes, projectSmartLists };
};
