import { db } from "$lib/server/db";
import { projects as projectsTable } from "$lib/server/db/schema";
import { fail, redirect } from "@sveltejs/kit";
import type { Actions } from "./$types";

export const actions = {
	createProject: async ({ request, locals }) => {
		const session = await locals.auth();
		if (!session?.user?.id) throw redirect(303, "/login");
		const fd = await request.formData();
		const name = fd.get("name")?.toString().trim();
		if (!name) return fail(400, { createProjectError: "Name is required" });
		const [created] = await db
			.insert(projectsTable)
			.values({ ownerId: session.user.id, name })
			.returning({ id: projectsTable.id });
		if (!created) return fail(500, { createProjectError: "Could not create project" });
		throw redirect(303, `/project/${created.id}`);
	},
} satisfies Actions;
