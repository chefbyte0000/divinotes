import { json, error } from "@sveltejs/kit";
import type { FullArchivePayloadV1 } from "$lib/export/archive-types";
import { db } from "$lib/server/db";
import {
	noteLinks as noteLinksTable,
	notes as notesTable,
	projects as projectsTable,
	smartLists as smartListsTable,
} from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import type { RequestHandler } from "./$types";

/** Synced relational snapshot for GDPR-style portable archive (merged client-side with device-local habits). */
export const GET: RequestHandler = async ({ locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) error(401, "Unauthorized");

	const uid = session.user.id;

	const [projects, notes, noteLinks, smartLists] = await Promise.all([
		db.select().from(projectsTable).where(eq(projectsTable.ownerId, uid)),
		db.select().from(notesTable).where(eq(notesTable.ownerId, uid)),
		db.select().from(noteLinksTable).where(eq(noteLinksTable.ownerId, uid)),
		db.select().from(smartListsTable).where(eq(smartListsTable.ownerId, uid)),
	]);

	const payload: FullArchivePayloadV1 = {
		version: 1,
		exportedAt: new Date().toISOString(),
		projects,
		notes,
		noteLinks,
		smartLists,
	};

	return json(payload);
};
