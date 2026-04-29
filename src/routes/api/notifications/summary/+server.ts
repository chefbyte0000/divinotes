import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { countUnreadNotifications } from "$lib/server/notification-service";

export const GET: RequestHandler = async ({ locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) error(401, "Unauthorized");

	const unreadCount = await countUnreadNotifications(session.user.id);
	return json({ unreadCount });
};
