import { db } from "$lib/server/db";
import { notes, noteLinks as noteLinksTable } from "$lib/server/db/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";

/** Replace outgoing links from `sourceNoteId` to match wiki targets; validates same owner + project silo. */
export async function syncOutgoingNoteLinks(params: {
	ownerId: string;
	sourceNoteId: string;
	sourceProjectId: string | null;
	targetIds: string[];
}) {
	const { ownerId, sourceNoteId, sourceProjectId, targetIds } = params;

	const unique = [...new Set(targetIds)].filter((id) => id !== sourceNoteId);
	if (unique.length === 0) {
		await db.delete(noteLinksTable).where(eq(noteLinksTable.sourceNoteId, sourceNoteId));
		return;
	}

	const scopeFilter =
		sourceProjectId === null ? isNull(notes.projectId) : eq(notes.projectId, sourceProjectId);

	const validRows = await db
		.select({ id: notes.id })
		.from(notes)
		.where(and(eq(notes.ownerId, ownerId), scopeFilter, inArray(notes.id, unique)));

	const allowed = new Set(validRows.map((r) => r.id));

	await db.delete(noteLinksTable).where(eq(noteLinksTable.sourceNoteId, sourceNoteId));

	const rows = [...allowed].map((targetNoteId) => ({
		ownerId,
		sourceNoteId,
		targetNoteId,
	}));

	if (rows.length) await db.insert(noteLinksTable).values(rows);
}
