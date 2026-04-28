import { db } from "$lib/server/db";
import { projects as projectsTable, smartLists as smartListsTable } from "$lib/server/db/schema";
import { desc, eq } from "drizzle-orm";
import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) throw redirect(303, "/login");

	const lists = await db
		.select({
			id: smartListsTable.id,
			title: smartListsTable.title,
			projectId: smartListsTable.projectId,
			updatedAt: smartListsTable.updatedAt,
			projectName: projectsTable.name,
		})
		.from(smartListsTable)
		.leftJoin(projectsTable, eq(smartListsTable.projectId, projectsTable.id))
		.where(eq(smartListsTable.ownerId, session.user.id))
		.orderBy(desc(smartListsTable.updatedAt));

	return { lists };
};
