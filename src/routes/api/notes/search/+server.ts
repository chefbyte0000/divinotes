import { json } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import { notes as notesTable } from "$lib/server/db/schema";
import { and, desc, eq, ilike, isNull, ne, or } from "drizzle-orm";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) return json({ notes: [] }, { status: 401 });

	const q = url.searchParams.get("q")?.trim() ?? "";
	const projectId = url.searchParams.get("projectId");
	const excludeNoteId = url.searchParams.get("excludeNoteId");

	const filters = [
		eq(notesTable.ownerId, session.user.id),
		projectId ? eq(notesTable.projectId, projectId) : isNull(notesTable.projectId),
	];

	if (excludeNoteId) {
		filters.push(ne(notesTable.id, excludeNoteId));
	}

	if (q.length > 0) {
		filters.push(
			or(ilike(notesTable.title, `%${q}%`), ilike(notesTable.description, `%${q}%`))!,
		);
	}

	const rows = await db
		.select({
			id: notesTable.id,
			title: notesTable.title,
		})
		.from(notesTable)
		.where(and(...filters))
		.orderBy(desc(notesTable.updatedAt))
		.limit(25);

	return json({ notes: rows });
};
