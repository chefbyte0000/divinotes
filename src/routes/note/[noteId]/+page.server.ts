import { db } from "$lib/server/db";
import { noteLinks as noteLinksTable, notes as notesTable } from "$lib/server/db/schema";
import { and, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
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

	return { note, backlinks };
};
