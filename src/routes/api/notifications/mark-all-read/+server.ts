import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { markAllNotificationsRead } from "$lib/server/notification-service";

export const POST: RequestHandler = async ({ locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) error(401, "Unauthorized");

	await markAllNotificationsRead(session.user.id);
	return json({ ok: true });
};
