import { json, error } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import {
	notes as notesTable,
	projects as projectsTable,
} from "$lib/server/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { parseNoteBody } from "$lib/tiptap/parse-note-body";
import { jsonContentToPlainText } from "$lib/tiptap/json-content-to-plain-text";
import type { RequestHandler } from "./$types";

const MAX_NOTES = 48;
const BODY_PREVIEW_CHARS = 1_600;

/** Project + note excerpts for on-device AI workspace organization (browser only). */
export const GET: RequestHandler = async ({ params, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) error(401, "Unauthorized");

	const projectId = params.projectId;

	const [project] = await db
		.select({
			id: projectsTable.id,
			name: projectsTable.name,
			description: projectsTable.description,
		})
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
		})
		.from(notesTable)
		.where(and(eq(notesTable.ownerId, session.user.id), eq(notesTable.projectId, projectId)))
		.orderBy(desc(notesTable.updatedAt));

	const truncated = rows.length > MAX_NOTES;
	const slice = truncated ? rows.slice(0, MAX_NOTES) : rows;

	const notes = slice.map((row) => {
		const doc = parseNoteBody(row.body);
		const plain = jsonContentToPlainText(doc);
		const excerpt =
			plain.length > BODY_PREVIEW_CHARS
				? `${plain.slice(0, BODY_PREVIEW_CHARS).trimEnd()}…`
				: plain.trim();
		return {
			id: row.id,
			title: row.title ?? "",
			description: row.description ?? "",
			metadata: row.metadata,
			bodyExcerpt: excerpt,
		};
	});

	return json({
		project: {
			id: project.id,
			name: project.name,
			description: project.description ?? "",
		},
		notes,
		truncated,
		maxNotes: MAX_NOTES,
	});
};
