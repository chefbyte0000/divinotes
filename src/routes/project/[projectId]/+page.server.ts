import { db } from "$lib/server/db";
import { projects as projectsTable } from "$lib/server/db/schema";
import { and, eq } from "drizzle-orm";
import { error, redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) throw redirect(303, "/login");

	const [project] = await db
		.select()
		.from(projectsTable)
		.where(and(eq(projectsTable.id, params.projectId), eq(projectsTable.ownerId, session.user.id)))
		.limit(1);

	if (!project) error(404, "Project not found");

	return { project };
};
