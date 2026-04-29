import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import type { NotificationAudienceV1, NotificationScheduleV1 } from "$lib/server/db/schema";
import {
	type CreateCampaignInput,
	archiveCampaign,
	createAndDeliverCampaign,
	createNotificationGroup,
	deleteNotificationGroup,
	listCampaignRowsForAdmin,
	listNotificationGroups,
	setCampaignActive,
	updateNotificationGroup,
} from "$lib/server/notification-service";

const ROLES = ["admin", "premium", "standard"] as const;

function parseAudience(fd: FormData): NotificationAudienceV1 | { error: string } {
	const scope = String(fd.get("audienceScope") ?? "all").trim();
	if (scope === "all") return { version: 1, scope: "all" };

	if (scope === "roles") {
		const picked = fd.getAll("roles").map((v) => String(v)) as string[];
		const roles = picked.filter((r): r is (typeof ROLES)[number] =>
			(ROLES as readonly string[]).includes(r),
		);
		if (!roles.length) return { error: "Select at least one role." };
		return { version: 1, scope: "roles", roles };
	}

	if (scope === "users") {
		const raw = String(fd.get("userIdsText") ?? "");
		const userIds = [
			...new Set(
				raw
					.split(/[\s,;]+/g)
					.map((s) => s.trim())
					.filter(Boolean),
			),
		];
		if (!userIds.length) return { error: "Enter at least one user id for a targeted send." };
		return { version: 1, scope: "users", userIds };
	}

	if (scope === "group") {
		const groupId = String(fd.get("groupId") ?? "").trim();
		if (!groupId) return { error: "Choose an audience group." };
		return { version: 1, scope: "group", groupId };
	}

	return { error: "Invalid audience scope." };
}

function parseSchedule(fd: FormData): NotificationScheduleV1 | { error: string } {
	const mode = String(fd.get("scheduleMode") ?? "once").trim();
	if (mode === "once") return { version: 1, mode: "once" };

	const intervalRaw = String(fd.get("interval") ?? "daily").trim();
	if (!["daily", "weekly", "monthly"].includes(intervalRaw)) {
		return { error: "Invalid recurrence interval." };
	}
	const interval = intervalRaw as "daily" | "weekly" | "monthly";

	const hourUtc = Number.parseInt(String(fd.get("hourUtc") ?? "9"), 10);
	const minuteUtc = Number.parseInt(String(fd.get("minuteUtc") ?? "0"), 10);
	if (!Number.isFinite(hourUtc) || hourUtc < 0 || hourUtc > 23) {
		return { error: "Hour UTC must be 0–23." };
	}
	if (!Number.isFinite(minuteUtc) || minuteUtc < 0 || minuteUtc > 59) {
		return { error: "Minute must be 0–59." };
	}

	if (interval === "weekly") {
		const weekdayUtc = Number.parseInt(String(fd.get("weekdayUtc") ?? "1"), 10);
		if (!Number.isFinite(weekdayUtc) || weekdayUtc < 0 || weekdayUtc > 6) {
			return { error: "Weekday must be 0–6 (UTC)." };
		}
		return {
			version: 1,
			mode: "recurring",
			interval: "weekly",
			hourUtc,
			minuteUtc,
			weekdayUtc,
		};
	}

	if (interval === "monthly") {
		const dayOfMonth = Number.parseInt(String(fd.get("dayOfMonth") ?? "1"), 10);
		if (!Number.isFinite(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 28) {
			return { error: "Day of month must be 1–28." };
		}
		return {
			version: 1,
			mode: "recurring",
			interval: "monthly",
			hourUtc,
			minuteUtc,
			dayOfMonth,
		};
	}

	return { version: 1, mode: "recurring", interval: "daily", hourUtc, minuteUtc };
}

export const load: PageServerLoad = async () => {
	const campaigns = await listCampaignRowsForAdmin();
	const groups = await listNotificationGroups();
	return { campaigns, groups };
};

export const actions: Actions = {
	createCampaign: async ({ request, locals }) => {
		const session = await locals.auth();
		const adminId = session?.user?.id;
		if (!adminId) return fail(401, { error: "Unauthorized." });

		const fd = await request.formData();
		const title = String(fd.get("title") ?? "").trim();
		const body = String(fd.get("body") ?? "").trim();
		const kind = String(fd.get("kind") ?? "information").trim();

		const validKinds = ["announcement", "information", "alert", "reminder"] as const;
		if (!title) return fail(400, { error: "Title is required." });
		if (!body) return fail(400, { error: "Body is required." });
		if (!validKinds.includes(kind as (typeof validKinds)[number])) {
			return fail(400, { error: "Invalid notification type." });
		}

		const audience = parseAudience(fd);
		if ("error" in audience) return fail(400, { error: audience.error });

		const schedule = parseSchedule(fd);
		if ("error" in schedule) return fail(400, { error: schedule.error });

		try {
			await createAndDeliverCampaign({
				title,
				body,
				kind: kind as CreateCampaignInput["kind"],
				audience,
				schedule,
				createdByUserId: adminId,
			});
			return { success: true };
		} catch (e) {
			console.error(e);
			return fail(500, { error: "Could not create notification campaign." });
		}
	},

	toggleCampaignActive: async ({ request, locals }) => {
		const session = await locals.auth();
		if (!session?.user?.id) return fail(401, { error: "Unauthorized." });

		const fd = await request.formData();
		const campaignId = String(fd.get("campaignId") ?? "").trim();
		const nextActive = String(fd.get("nextActive") ?? "") === "true";
		if (!campaignId) return fail(400, { error: "Missing campaign." });

		await setCampaignActive(campaignId, nextActive);
		return { success: true };
	},

	archiveCampaign: async ({ request, locals }) => {
		const session = await locals.auth();
		if (!session?.user?.id) return fail(401, { error: "Unauthorized." });

		const fd = await request.formData();
		const campaignId = String(fd.get("campaignId") ?? "").trim();
		if (!campaignId) return fail(400, { error: "Missing campaign." });

		await archiveCampaign(campaignId);
		return { success: true };
	},

	createGroup: async ({ request, locals }) => {
		const session = await locals.auth();
		if (!session?.user?.id) return fail(401, { error: "Unauthorized." });

		const fd = await request.formData();
		const name = String(fd.get("name") ?? "").trim();
		const raw = String(fd.get("memberUserIdsText") ?? "");
		const memberUserIds = [
			...new Set(
				raw
					.split(/[\s,;]+/g)
					.map((s) => s.trim())
					.filter(Boolean),
			),
		];
		if (!name) return fail(400, { error: "Group name is required." });
		if (!memberUserIds.length) return fail(400, { error: "Add at least one member user id." });

		await createNotificationGroup(name, memberUserIds);
		return { success: true };
	},

	updateGroup: async ({ request, locals }) => {
		const session = await locals.auth();
		if (!session?.user?.id) return fail(401, { error: "Unauthorized." });

		const fd = await request.formData();
		const id = String(fd.get("groupId") ?? "").trim();
		const name = String(fd.get("name") ?? "").trim();
		const raw = String(fd.get("memberUserIdsText") ?? "");
		const memberUserIds = [
			...new Set(
				raw
					.split(/[\s,;]+/g)
					.map((s) => s.trim())
					.filter(Boolean),
			),
		];
		if (!id) return fail(400, { error: "Missing group." });
		if (!name) return fail(400, { error: "Group name is required." });
		if (!memberUserIds.length) return fail(400, { error: "Add at least one member user id." });

		const row = await updateNotificationGroup(id, name, memberUserIds);
		if (!row) return fail(404, { error: "Group not found." });
		return { success: true };
	},

	deleteGroup: async ({ request, locals }) => {
		const session = await locals.auth();
		if (!session?.user?.id) return fail(401, { error: "Unauthorized." });

		const fd = await request.formData();
		const id = String(fd.get("groupId") ?? "").trim();
		if (!id) return fail(400, { error: "Missing group." });

		await deleteNotificationGroup(id);
		return { success: true };
	},
};
