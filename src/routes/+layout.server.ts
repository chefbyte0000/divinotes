import type { LayoutServerLoad } from "./$types";
import { db } from "$lib/server/db";
import { notes as notesTable, projects as projectsTable, type Project } from "$lib/server/db/schema";
import type { WorkspaceNoteSummary } from "$lib/types/workspace-notes";
import { asc, desc, eq } from "drizzle-orm";
import {
	countUnreadNotifications,
	listNotificationPreview,
	processDueNotificationCampaigns,
} from "$lib/server/notification-service";

export type { WorkspaceNoteSummary };

export const load: LayoutServerLoad = async (event) => {
	const session = await event.locals.auth();
	let projects: Project[] = [];
	let workspaceNotes: WorkspaceNoteSummary[] = [];
	let notificationBell: {
		unreadCount: number;
		preview: Awaited<ReturnType<typeof listNotificationPreview>>;
	} = { unreadCount: 0, preview: [] };

	if (session?.user?.id) {
		await processDueNotificationCampaigns();

		const [unreadCount, preview] = await Promise.all([
			countUnreadNotifications(session.user.id),
			listNotificationPreview(session.user.id, 8),
		]);
		notificationBell = { unreadCount, preview };

		projects = await db
			.select()
			.from(projectsTable)
			.where(eq(projectsTable.ownerId, session.user.id))
			.orderBy(asc(projectsTable.name));

		workspaceNotes = await db
			.select({
				id: notesTable.id,
				title: notesTable.title,
				projectId: notesTable.projectId,
			})
			.from(notesTable)
			.where(eq(notesTable.ownerId, session.user.id))
			.orderBy(desc(notesTable.updatedAt))
			.limit(400);
	}

	return { session, projects, workspaceNotes, notificationBell };
};
