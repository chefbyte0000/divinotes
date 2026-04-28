import { db } from "$lib/server/db";
import { projects as projectsTable, smartLists as smartListsTable } from "$lib/server/db/schema";
import { and, eq } from "drizzle-orm";
import { error, redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) throw redirect(303, "/login");

	const [list] = await db
		.select()
		.from(smartListsTable)
		.where(and(eq(smartListsTable.id, params.listId), eq(smartListsTable.ownerId, session.user.id)))
		.limit(1);

	if (!list) error(404, "List not found");

	const projectRows = await db
		.select({ id: projectsTable.id, name: projectsTable.name })
		.from(projectsTable)
		.where(eq(projectsTable.ownerId, session.user.id));

	const projectNamesById = Object.fromEntries(projectRows.map((p) => [p.id, p.name]));

	return { list, projectNamesById };
};
