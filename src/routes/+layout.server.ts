import type { LayoutServerLoad } from "./$types";
import { db } from "$lib/server/db";
import { notes as notesTable, projects as projectsTable, type Project } from "$lib/server/db/schema";
import type { WorkspaceNoteSummary } from "$lib/types/workspace-notes";
import { asc, desc, eq } from "drizzle-orm";

export type { WorkspaceNoteSummary };

export const load: LayoutServerLoad = async (event) => {
	const session = await event.locals.auth();
	let projects: Project[] = [];
	let workspaceNotes: WorkspaceNoteSummary[] = [];

	if (session?.user?.id) {
		projects = await db
			.select()
			.from(projectsTable)
			.where(eq(projectsTable.ownerId, session.user.id))
			.orderBy(asc(projectsTable.name));

		workspaceNotes = await db
			.select({
				id: notesTable.id,
				title: notesTable.title,
				projectId: notesTable.projectId,
			})
			.from(notesTable)
			.where(eq(notesTable.ownerId, session.user.id))
			.orderBy(desc(notesTable.updatedAt))
			.limit(400);
	}

	return { session, projects, workspaceNotes };
};
