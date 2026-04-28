import { json, error } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import { projects as projectsTable, smartLists as smartListsTable } from "$lib/server/db/schema";
import type { SmartListItemRow, SmartListMetadata } from "$lib/types/smart-list";
import { and, eq } from "drizzle-orm";
import type { RequestHandler } from "./$types";

function isItemRow(x: unknown): x is SmartListItemRow {
	if (x === null || typeof x !== "object") return false;
	const o = x as Record<string, unknown>;
	return typeof o.id === "string" && typeof o.text === "string";
}

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) error(401, "Unauthorized");

	const [existing] = await db
		.select()
		.from(smartListsTable)
		.where(and(eq(smartListsTable.id, params.listId), eq(smartListsTable.ownerId, session.user.id)))
		.limit(1);

	if (!existing) error(404, "List not found");

	const payload = (await request.json()) as {
		title?: string;
		description?: string | null;
		items?: unknown[];
		metadata?: Partial<SmartListMetadata>;
		projectId?: string | null;
	};

	const hasTitle = typeof payload.title === "string";
	const hasDescription = payload.description !== undefined;
	const hasItems = Array.isArray(payload.items);
	const hasMetadata =
		payload.metadata !== undefined && payload.metadata !== null && typeof payload.metadata === "object";
	const hasProjectId = payload.projectId !== undefined;

	if (!hasTitle && !hasDescription && !hasItems && !hasMetadata && !hasProjectId) {
		error(400, "Nothing to update");
	}

	let nextProjectId: string | null | undefined = undefined;
	if (hasProjectId) {
		const pid = payload.projectId ?? null;
		if (pid) {
			const [p] = await db
				.select()
				.from(projectsTable)
				.where(and(eq(projectsTable.id, pid), eq(projectsTable.ownerId, session.user.id)))
				.limit(1);
			if (!p) error(400, "Invalid project");
		}
		nextProjectId = pid;
	}

	let items: SmartListItemRow[] | undefined;
	if (hasItems) {
		if (!payload.items!.every(isItemRow)) error(400, "Invalid items");
		items = payload.items as SmartListItemRow[];
	}

	const mergedMeta: SmartListMetadata | undefined =
		hasMetadata ? { ...existing.metadata, ...payload.metadata! } : undefined;

	await db
		.update(smartListsTable)
		.set({
			...(hasTitle ? { title: payload.title!.trim() || "Untitled list" } : {}),
			...(hasDescription ? { description: payload.description } : {}),
			...(items !== undefined ? { items } : {}),
			...(mergedMeta !== undefined ? { metadata: mergedMeta } : {}),
			...(nextProjectId !== undefined ? { projectId: nextProjectId } : {}),
			updatedAt: new Date(),
		})
		.where(eq(smartListsTable.id, params.listId));

	return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) error(401, "Unauthorized");

	const [row] = await db
		.select({ id: smartListsTable.id })
		.from(smartListsTable)
		.where(and(eq(smartListsTable.id, params.listId), eq(smartListsTable.ownerId, session.user.id)))
		.limit(1);

	if (!row) error(404, "List not found");

	await db.delete(smartListsTable).where(eq(smartListsTable.id, params.listId));

	return json({ ok: true });
};
