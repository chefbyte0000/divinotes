import { db } from "$lib/server/db";
import { notes as notesTable, projects as projectsTable } from "$lib/server/db/schema";
import { jsonContentToPlainText } from "$lib/tiptap/json-content-to-plain-text";
import { parseNoteBody } from "$lib/tiptap/parse-note-body";
import { and, asc, eq } from "drizzle-orm";

/** Single concatenated corpus for project-scoped RAG / local AI context. */
export type ProjectContextBlob = {
	text: string;
	noteCount: number;
};

/**
 * Aggregate all note text in a project into one blob for Gemma / RAG.
 * Verifies `projectId` belongs to `ownerId`; returns `null` if not found.
 */
export async function getProjectContext(
	ownerId: string,
	projectId: string
): Promise<ProjectContextBlob | null> {
	const [project] = await db
		.select({ id: projectsTable.id })
		.from(projectsTable)
		.where(and(eq(projectsTable.id, projectId), eq(projectsTable.ownerId, ownerId)))
		.limit(1);

	if (!project) return null;

	const rows = await db
		.select({
			title: notesTable.title,
			description: notesTable.description,
			body: notesTable.body,
		})
		.from(notesTable)
		.where(and(eq(notesTable.ownerId, ownerId), eq(notesTable.projectId, projectId)))
		.orderBy(asc(notesTable.updatedAt));

	const segments: string[] = [];
	for (const row of rows) {
		const doc = parseNoteBody(row.body);
		const plain = jsonContentToPlainText(doc);
		const title = (row.title ?? "").trim() || "Untitled note";
		const desc = (row.description ?? "").trim();
		const block = [title, desc, plain].filter((s) => s.length > 0).join("\n\n");
		segments.push(block);
	}

	const text = segments.join("\n\n---\n\n");
	return { text, noteCount: rows.length };
}
