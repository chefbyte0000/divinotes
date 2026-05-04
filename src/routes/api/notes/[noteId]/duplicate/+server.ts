import { json, error } from "@sveltejs/kit";
import type { JSONContent } from "@tiptap/core";
import { db } from "$lib/server/db";
import { notes as notesTable } from "$lib/server/db/schema";
import { and, eq } from "drizzle-orm";
import { extractMentionIds } from "$lib/tiptap/extract-mention-ids";
import { syncOutgoingNoteLinks } from "$lib/server/notes/sync-note-links";
import type { RequestHandler } from "./$types";

const emptyDoc: JSONContent = {
	type: "doc",
	content: [{ type: "paragraph" }],
};

function duplicateTitle(title: string): string {
	const t = title.trim() || "Untitled note";
	return `${t} (copy)`;
}

export const POST: RequestHandler = async ({ params, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) error(401, "Unauthorized");

	const [note] = await db
		.select()
		.from(notesTable)
		.where(and(eq(notesTable.id, params.noteId), eq(notesTable.ownerId, session.user.id)))
		.limit(1);

	if (!note) error(404, "Note not found");

	let bodyStr = note.body;
	let content: JSONContent;
	try {
		content = bodyStr ? (JSON.parse(bodyStr) as JSONContent) : emptyDoc;
	} catch {
		content = emptyDoc;
		bodyStr = JSON.stringify(emptyDoc);
	}

	const [created] = await db
		.insert(notesTable)
		.values({
			ownerId: session.user.id,
			projectId: note.projectId,
			title: duplicateTitle(note.title),
			description: note.description,
			body: bodyStr ?? JSON.stringify(emptyDoc),
			metadata: { ...note.metadata },
		})
		.returning({ id: notesTable.id });

	if (!created) error(500, "Could not duplicate note");

	await syncOutgoingNoteLinks({
		ownerId: session.user.id,
		sourceNoteId: created.id,
		sourceProjectId: note.projectId,
		targetIds: extractMentionIds(content),
	});

	return json({ id: created.id });
};
