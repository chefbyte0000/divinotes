import { json, error } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import { projects as projectsTable } from "$lib/server/db/schema";
import { and, eq } from "drizzle-orm";
import type { RequestHandler } from "./$types";

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) error(401, "Unauthorized");

	const payload = (await request.json()) as { name?: string };
	if (typeof payload.name !== "string" || !payload.name.trim()) {
		error(400, "Project name is required");
	}

	const [project] = await db
		.select({ id: projectsTable.id })
		.from(projectsTable)
		.where(and(eq(projectsTable.id, params.projectId), eq(projectsTable.ownerId, session.user.id)))
		.limit(1);

	if (!project) error(404, "Project not found");

	await db
		.update(projectsTable)
		.set({ name: payload.name.trim(), updatedAt: new Date() })
		.where(eq(projectsTable.id, params.projectId));

	return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) error(401, "Unauthorized");

	const [project] = await db
		.select({ id: projectsTable.id })
		.from(projectsTable)
		.where(and(eq(projectsTable.id, params.projectId), eq(projectsTable.ownerId, session.user.id)))
		.limit(1);

	if (!project) error(404, "Project not found");

	await db.delete(projectsTable).where(eq(projectsTable.id, params.projectId));
	return json({ ok: true });
};
