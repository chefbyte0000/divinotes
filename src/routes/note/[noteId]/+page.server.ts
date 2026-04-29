import { db } from "$lib/server/db";
import {
	noteLinks as noteLinksTable,
	notes as notesTable,
	projects as projectsTable,
} from "$lib/server/db/schema";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { ProjectNoteRow } from "$lib/types/project-notes";
import { error, redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) throw redirect(303, "/login");

	const [note] = await db
		.select()
		.from(notesTable)
		.where(and(eq(notesTable.id, params.noteId), eq(notesTable.ownerId, session.user.id)))
		.limit(1);

	if (!note) error(404, "Note not found");

	const sourceNotes = alias(notesTable, "source_notes");

	const backlinks = await db
		.select({
			id: sourceNotes.id,
			title: sourceNotes.title,
		})
		.from(noteLinksTable)
		.innerJoin(sourceNotes, eq(sourceNotes.id, noteLinksTable.sourceNoteId))
		.where(and(eq(noteLinksTable.targetNoteId, params.noteId), eq(noteLinksTable.ownerId, session.user.id)));

	const sortRankKey = sql<number>`
		CASE
			WHEN ${notesTable.metadata}->>'sortRank' ~ '^[0-9]+$'
			THEN (${notesTable.metadata}->>'sortRank')::int
			ELSE 1000000000
		END
	`;

	let projectOrganize: {
		projectId: string;
		projectName: string;
		notes: ProjectNoteRow[];
	} | null = null;

	if (note.projectId) {
		const [proj] = await db
			.select({ id: projectsTable.id, name: projectsTable.name })
			.from(projectsTable)
			.where(
				and(eq(projectsTable.id, note.projectId), eq(projectsTable.ownerId, session.user.id)),
			)
			.limit(1);

		if (proj) {
			const projectNotes = await db
				.select({
					id: notesTable.id,
					title: notesTable.title,
					description: notesTable.description,
					updatedAt: notesTable.updatedAt,
					metadata: notesTable.metadata,
				})
				.from(notesTable)
				.where(
					and(eq(notesTable.ownerId, session.user.id), eq(notesTable.projectId, note.projectId)),
				)
				.orderBy(asc(sortRankKey), desc(notesTable.updatedAt));

			projectOrganize = {
				projectId: proj.id,
				projectName: proj.name,
				notes: projectNotes,
			};
		}
	}

	return { note, backlinks, projectOrganize };
};
