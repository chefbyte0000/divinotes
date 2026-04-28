import type { LayoutServerLoad } from "./$types";
import { db } from "$lib/server/db";
import { projects as projectsTable, type Project } from "$lib/server/db/schema";
import { asc, eq } from "drizzle-orm";

export const load: LayoutServerLoad = async (event) => {
	const session = await event.locals.auth();
	let projects: Project[] = [];
	if (session?.user?.id) {
		projects = await db
			.select()
			.from(projectsTable)
			.where(eq(projectsTable.ownerId, session.user.id))
			.orderBy(asc(projectsTable.name));
	}
	return { session, projects };
};
