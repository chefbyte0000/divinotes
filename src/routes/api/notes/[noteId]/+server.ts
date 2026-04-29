import { json, error } from "@sveltejs/kit";
import type { JSONContent } from "@tiptap/core";
import { db } from "$lib/server/db";
import { notes as notesTable, type NoteMetadata } from "$lib/server/db/schema";
import { and, eq } from "drizzle-orm";
import { extractMentionIds } from "$lib/tiptap/extract-mention-ids";
import { syncOutgoingNoteLinks } from "$lib/server/notes/sync-note-links";
import type { RequestHandler } from "./$types";

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) error(401, "Unauthorized");

	const payload = (await request.json()) as {
		content?: JSONContent;
		title?: string;
		description?: string;
		metadata?: Partial<NoteMetadata>;
	};

	const hasContent = payload.content !== undefined;
	const hasTitle = typeof payload.title === "string";
	const hasDescription = typeof payload.description === "string";
	const hasMetadata =
		payload.metadata !== undefined && payload.metadata !== null && typeof payload.metadata === "object";

	if (!hasContent && !hasTitle && !hasDescription && !hasMetadata) {
		error(400, "Provide title, description, content, and/or metadata");
	}

	const [note] = await db
		.select()
		.from(notesTable)
		.where(and(eq(notesTable.id, params.noteId), eq(notesTable.ownerId, session.user.id)))
		.limit(1);

	if (!note) error(404, "Note not found");

	const mergedMetadata: NoteMetadata | undefined =
		hasMetadata ? { ...note.metadata, ...payload.metadata! } : undefined;

	await db
		.update(notesTable)
		.set({
			...(hasTitle ? { title: payload.title!.trim() || "Untitled note" } : {}),
			...(hasDescription ? { description: payload.description!.trim() } : {}),
			...(hasContent ? { body: JSON.stringify(payload.content) } : {}),
			...(mergedMetadata !== undefined ? { metadata: mergedMetadata } : {}),
			updatedAt: new Date(),
		})
		.where(eq(notesTable.id, params.noteId));

	if (hasContent) {
		await syncOutgoingNoteLinks({
			ownerId: session.user.id,
			sourceNoteId: params.noteId,
			sourceProjectId: note.projectId,
			targetIds: extractMentionIds(payload.content as JSONContent),
		});
	}

	return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) error(401, "Unauthorized");

	const [note] = await db
		.select({ id: notesTable.id })
		.from(notesTable)
		.where(and(eq(notesTable.id, params.noteId), eq(notesTable.ownerId, session.user.id)))
		.limit(1);

	if (!note) error(404, "Note not found");

	await db.delete(notesTable).where(eq(notesTable.id, params.noteId));

	return json({ ok: true });
};
