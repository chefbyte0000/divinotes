import { json, error } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import { users } from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import type { RequestHandler } from "./$types";

/** Deletes the signed-in user row — cascades projects, notes, links, lists, auth rows. */
export const DELETE: RequestHandler = async ({ locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) error(401, "Unauthorized");

	await db.delete(users).where(eq(users.id, session.user.id));

	return json({ ok: true });
};
