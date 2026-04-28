import { db } from "$lib/server/db";
import { notes as notesTable } from "$lib/server/db/schema";
import type { Note } from "$lib/server/db/schema";
import { and, eq, gte, isNull } from "drizzle-orm";
import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) throw redirect(303, "/login");

	const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

	const inboxNotes: Note[] = await db
		.select()
		.from(notesTable)
		.where(
			and(
				eq(notesTable.ownerId, session.user.id),
				isNull(notesTable.projectId),
				gte(notesTable.createdAt, since)
			)
		)
		.orderBy(notesTable.createdAt);

	return { inboxNotes };
};
