import { and, desc, eq, inArray, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { db } from "$lib/server/db";
import {
	notificationCampaigns,
	notificationGroups,
	userNotifications,
	users,
	type NotificationAudienceV1,
	type NotificationCampaign,
	type NotificationScheduleV1,
} from "$lib/server/db/schema";

type DbLike = typeof db;

function utcDate(y: number, m: number, day: number, h: number, min: number) {
	return new Date(Date.UTC(y, m, day, h, min, 0, 0));
}

function utcParts(d: Date) {
	return {
		y: d.getUTCFullYear(),
		m: d.getUTCMonth(),
		day: d.getUTCDate(),
	};
}

/** Next daily slot at hourUtc:minuteUtc strictly after `after`. */
export function nextDailyUtc(after: Date, hourUtc: number, minuteUtc: number): Date {
	const p = utcParts(after);
	let candidate = utcDate(p.y, p.m, p.day, hourUtc, minuteUtc);
	if (candidate.getTime() <= after.getTime()) {
		candidate = utcDate(p.y, p.m, p.day + 1, hourUtc, minuteUtc);
	}
	return candidate;
}

export function nextWeeklyUtc(
	after: Date,
	weekdayUtc: number,
	hourUtc: number,
	minuteUtc: number,
): Date {
	const c = new Date(after.getTime());
	c.setUTCMinutes(c.getUTCMinutes() + 1);
	for (let i = 0; i < 400; i++) {
		if (c.getUTCDay() === weekdayUtc) {
			const slot = utcDate(
				c.getUTCFullYear(),
				c.getUTCMonth(),
				c.getUTCDate(),
				hourUtc,
				minuteUtc,
			);
			if (slot.getTime() > after.getTime()) return slot;
		}
		c.setUTCDate(c.getUTCDate() + 1);
	}
	return nextDailyUtc(after, hourUtc, minuteUtc);
}

function clampDayOfMonth(y: number, m: number, day: number) {
	const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
	return Math.min(day, last);
}

export function nextMonthlyUtc(
	after: Date,
	dayOfMonth: number,
	hourUtc: number,
	minuteUtc: number,
): Date {
	let y = after.getUTCFullYear();
	let mo = after.getUTCMonth();
	for (let step = 0; step < 500; step++) {
		const d = clampDayOfMonth(y, mo, dayOfMonth);
		const slot = utcDate(y, mo, d, hourUtc, minuteUtc);
		if (slot.getTime() > after.getTime()) return slot;
		mo += 1;
		if (mo > 11) {
			mo = 0;
			y += 1;
		}
	}
	return nextDailyUtc(after, hourUtc, minuteUtc);
}

export function computeNextFireAfterAnchor(
	schedule: NotificationScheduleV1,
	anchor: Date,
): Date | null {
	if (schedule.mode !== "recurring") return null;
	const { interval, hourUtc, minuteUtc, weekdayUtc = 1, dayOfMonth = 1 } = schedule;
	switch (interval) {
		case "daily":
			return nextDailyUtc(anchor, hourUtc, minuteUtc);
		case "weekly":
			return nextWeeklyUtc(anchor, weekdayUtc, hourUtc, minuteUtc);
		case "monthly":
			return nextMonthlyUtc(anchor, dayOfMonth, hourUtc, minuteUtc);
		default:
			return nextDailyUtc(anchor, hourUtc, minuteUtc);
	}
}

export async function resolveAudienceUserIds(
	audience: NotificationAudienceV1,
	client: DbLike = db,
): Promise<string[]> {
	if (audience.version !== 1) return [];

	switch (audience.scope) {
		case "all": {
			const rows = await client.select({ id: users.id }).from(users);
			return rows.map((r) => r.id);
		}
		case "roles": {
			const roles = (audience.roles?.length ? audience.roles : ["standard"]) as readonly (
				| "admin"
				| "premium"
				| "standard"
			)[];
			const rows = await client.select({ id: users.id }).from(users).where(inArray(users.role, roles));
			return rows.map((r) => r.id);
		}
		case "users": {
			const ids = [...new Set(audience.userIds ?? [])].filter(Boolean);
			if (!ids.length) return [];
			const rows = await client.select({ id: users.id }).from(users).where(inArray(users.id, ids));
			return rows.map((r) => r.id);
		}
		case "group": {
			const gid = audience.groupId?.trim();
			if (!gid) return [];
			const [g] = await client
				.select()
				.from(notificationGroups)
				.where(eq(notificationGroups.id, gid))
				.limit(1);
			if (!g) return [];
			const ids = [...new Set((g.memberUserIds ?? []) as string[])].filter(Boolean);
			if (!ids.length) return [];
			const rows = await client.select({ id: users.id }).from(users).where(inArray(users.id, ids));
			return rows.map((r) => r.id);
		}
		default:
			return [];
	}
}

export async function fanOutCampaignToUsers(
	campaign: Pick<
		NotificationCampaign,
		"id" | "title" | "body" | "kind" | "audience"
	>,
	client: DbLike = db,
): Promise<number> {
	const userIds = await resolveAudienceUserIds(campaign.audience, client);
	if (!userIds.length) return 0;

	const rows = userIds.map((userId) => ({
		userId,
		campaignId: campaign.id,
		title: campaign.title,
		body: campaign.body,
		kind: campaign.kind,
		payload: {} as Record<string, unknown>,
	}));

	await client.insert(userNotifications).values(rows);
	return userIds.length;
}

export type CreateCampaignInput = {
	title: string;
	body: string;
	kind: NotificationCampaign["kind"];
	audience: NotificationAudienceV1;
	schedule: NotificationScheduleV1;
	createdByUserId: string;
};

export async function createAndDeliverCampaign(input: CreateCampaignInput): Promise<NotificationCampaign> {
	const now = new Date();
	const isRecurring = input.schedule.mode === "recurring";

	const [campaign] = await db
		.insert(notificationCampaigns)
		.values({
			title: input.title.trim(),
			body: input.body.trim(),
			kind: input.kind,
			audience: input.audience,
			schedule: input.schedule,
			isRecurring,
			nextFireAt: null,
			isActive: true,
			createdByUserId: input.createdByUserId,
			updatedAt: now,
		})
		.returning();

	if (!campaign) throw new Error("Failed to create campaign");

	// Always deliver an initial wave (one-shot ends here; recurring repeats via processor)
	const count = await db.transaction(async (tx) => {
		return fanOutCampaignToUsers(campaign, tx as unknown as DbLike);
	});

	const after = new Date();
	if (!isRecurring) {
		const [updated] = await db
			.update(notificationCampaigns)
			.set({
				lastFiredAt: after,
				lastRecipientCount: count,
				nextFireAt: null,
				isActive: false,
				updatedAt: after,
			})
			.where(eq(notificationCampaigns.id, campaign.id))
			.returning();
		return updated ?? campaign;
	}

	const nextFireAt = computeNextFireAfterAnchor(input.schedule, after);
	const [updated] = await db
		.update(notificationCampaigns)
		.set({
			lastFiredAt: after,
			lastRecipientCount: count,
			nextFireAt,
			updatedAt: after,
		})
		.where(eq(notificationCampaigns.id, campaign.id))
		.returning();

	return updated ?? campaign;
}

export async function processDueNotificationCampaigns(now: Date = new Date()): Promise<number> {
	const due = await db
		.select()
		.from(notificationCampaigns)
		.where(
			and(
				eq(notificationCampaigns.isActive, true),
				eq(notificationCampaigns.isRecurring, true),
				isNotNull(notificationCampaigns.nextFireAt),
				lte(notificationCampaigns.nextFireAt, now),
			),
		);

	let processed = 0;
	for (const row of due) {
		const schedule = row.schedule;
		if (schedule.mode !== "recurring") continue;

		const anchor = row.nextFireAt ?? now;
		const count = await db.transaction(async (tx) => {
			return fanOutCampaignToUsers(row, tx as unknown as DbLike);
		});

		const nextFire = computeNextFireAfterAnchor(schedule, anchor);
		await db
			.update(notificationCampaigns)
			.set({
				lastFiredAt: now,
				lastRecipientCount: count,
				nextFireAt: nextFire,
				updatedAt: now,
			})
			.where(eq(notificationCampaigns.id, row.id));

		processed += 1;
	}
	return processed;
}

export async function listCampaignRowsForAdmin() {
	const rows = await db
		.select({
			id: notificationCampaigns.id,
			title: notificationCampaigns.title,
			body: notificationCampaigns.body,
			kind: notificationCampaigns.kind,
			audience: notificationCampaigns.audience,
			schedule: notificationCampaigns.schedule,
			isRecurring: notificationCampaigns.isRecurring,
			nextFireAt: notificationCampaigns.nextFireAt,
			lastFiredAt: notificationCampaigns.lastFiredAt,
			isActive: notificationCampaigns.isActive,
			lastRecipientCount: notificationCampaigns.lastRecipientCount,
			createdAt: notificationCampaigns.createdAt,
			createdByUserId: notificationCampaigns.createdByUserId,
			creatorName: users.name,
			creatorEmail: users.email,
		})
		.from(notificationCampaigns)
		.innerJoin(users, eq(notificationCampaigns.createdByUserId, users.id))
		.orderBy(desc(notificationCampaigns.createdAt));

	return rows.map((r) => ({
		...r,
		createdAt: r.createdAt?.toISOString() ?? null,
		nextFireAt: r.nextFireAt?.toISOString() ?? null,
		lastFiredAt: r.lastFiredAt?.toISOString() ?? null,
	}));
}

export async function setCampaignActive(id: string, isActive: boolean) {
	await db
		.update(notificationCampaigns)
		.set({ isActive, updatedAt: new Date() })
		.where(eq(notificationCampaigns.id, id));
}

export async function archiveCampaign(id: string) {
	await db
		.update(notificationCampaigns)
		.set({ isActive: false, nextFireAt: null, updatedAt: new Date() })
		.where(eq(notificationCampaigns.id, id));
}

export async function listNotificationGroups() {
	const rows = await db.select().from(notificationGroups).orderBy(notificationGroups.name);
	return rows.map((g) => ({
		id: g.id,
		name: g.name,
		memberUserIds: g.memberUserIds ?? [],
		memberCount: (g.memberUserIds ?? []).length,
		createdAt: g.createdAt?.toISOString() ?? null,
		updatedAt: g.updatedAt?.toISOString() ?? null,
	}));
}

export async function createNotificationGroup(name: string, memberUserIds: string[]) {
	const [row] = await db
		.insert(notificationGroups)
		.values({
			name: name.trim(),
			memberUserIds: [...new Set(memberUserIds)],
			updatedAt: new Date(),
		})
		.returning();
	return row;
}

export async function updateNotificationGroup(id: string, name: string, memberUserIds: string[]) {
	const [row] = await db
		.update(notificationGroups)
		.set({
			name: name.trim(),
			memberUserIds: [...new Set(memberUserIds)],
			updatedAt: new Date(),
		})
		.where(eq(notificationGroups.id, id))
		.returning();
	return row;
}

export async function deleteNotificationGroup(id: string) {
	await db.delete(notificationGroups).where(eq(notificationGroups.id, id));
}

export async function countUnreadNotifications(userId: string): Promise<number> {
	const [row] = await db
		.select({ c: sql<number>`count(*)::int` })
		.from(userNotifications)
		.where(and(eq(userNotifications.userId, userId), isNull(userNotifications.readAt)));
	return row?.c ?? 0;
}

export async function listNotificationPreview(userId: string, limit = 8) {
	const rows = await db
		.select()
		.from(userNotifications)
		.where(eq(userNotifications.userId, userId))
		.orderBy(desc(userNotifications.createdAt))
		.limit(limit);

	return rows.map((n) => ({
		id: n.id,
		title: n.title,
		body: n.body,
		kind: n.kind,
		readAt: n.readAt?.toISOString() ?? null,
		createdAt: n.createdAt?.toISOString() ?? null,
		linkUrl: n.linkUrl,
	}));
}

export async function listInboxPage(
	userId: string,
	opts: { unreadOnly?: boolean; limit: number; offset: number },
) {
	const cond = opts.unreadOnly
		? and(eq(userNotifications.userId, userId), isNull(userNotifications.readAt))
		: eq(userNotifications.userId, userId);

	const rows = await db
		.select()
		.from(userNotifications)
		.where(cond)
		.orderBy(desc(userNotifications.createdAt))
		.limit(opts.limit)
		.offset(opts.offset);

	const [countRow] = await db
		.select({ c: sql<number>`count(*)::int` })
		.from(userNotifications)
		.where(cond);

	return {
		items: rows.map((n) => ({
			id: n.id,
			title: n.title,
			body: n.body,
			kind: n.kind,
			readAt: n.readAt?.toISOString() ?? null,
			createdAt: n.createdAt?.toISOString() ?? null,
			linkUrl: n.linkUrl,
			campaignId: n.campaignId,
		})),
		total: countRow?.c ?? 0,
	};
}

export async function markNotificationRead(userId: string, notificationId: string) {
	const now = new Date();
	await db
		.update(userNotifications)
		.set({ readAt: now })
		.where(
			and(eq(userNotifications.id, notificationId), eq(userNotifications.userId, userId), isNull(userNotifications.readAt)),
		);
}

export async function markAllNotificationsRead(userId: string) {
	const now = new Date();
	await db
		.update(userNotifications)
		.set({ readAt: now })
		.where(and(eq(userNotifications.userId, userId), isNull(userNotifications.readAt)));
}

