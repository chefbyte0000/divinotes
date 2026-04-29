import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { markNotificationRead } from "$lib/server/notification-service";

export const POST: RequestHandler = async ({ locals, params }) => {
	const session = await locals.auth();
	if (!session?.user?.id) error(401, "Unauthorized");

	const id = params.notificationId?.trim();
	if (!id) error(400, "Missing notification id");

	await markNotificationRead(session.user.id, id);
	return json({ ok: true });
};
