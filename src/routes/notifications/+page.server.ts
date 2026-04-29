import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import {
	listInboxPage,
	markAllNotificationsRead,
	markNotificationRead,
	countUnreadNotifications,
} from "$lib/server/notification-service";

const PAGE_SIZE = 40;

export const load: PageServerLoad = async ({ locals, url }) => {
	const session = await locals.auth();
	if (!session?.user?.id) throw redirect(303, "/login");

	const unreadOnly = url.searchParams.get("filter") === "unread";
	const pageNum = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
	const offset = (pageNum - 1) * PAGE_SIZE;

	const [{ items, total }, unreadCount] = await Promise.all([
		listInboxPage(session.user.id, { unreadOnly, limit: PAGE_SIZE, offset }),
		countUnreadNotifications(session.user.id),
	]);

	return {
		items,
		total,
		page: pageNum,
		pageSize: PAGE_SIZE,
		unreadOnly,
		unreadCount,
	};
};

export const actions: Actions = {
	markRead: async ({ request, locals }) => {
		const session = await locals.auth();
		if (!session?.user?.id) return fail(401, { error: "Unauthorized" });

		const fd = await request.formData();
		const id = String(fd.get("notificationId") ?? "").trim();
		if (!id) return fail(400, { error: "Missing id" });

		await markNotificationRead(session.user.id, id);
		return { ok: true };
	},

	markAllRead: async ({ locals }) => {
		const session = await locals.auth();
		if (!session?.user?.id) return fail(401, { error: "Unauthorized" });

		await markAllNotificationsRead(session.user.id);
		return { ok: true };
	},
};
