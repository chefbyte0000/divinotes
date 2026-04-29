import {
	pgTable,
	text,
	timestamp,
	primaryKey,
	integer,
	boolean,
	pgEnum,
	jsonb,
	uniqueIndex,
	index,
} from "drizzle-orm/pg-core";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type { SmartListItemRow, SmartListMetadata } from "$lib/types/smart-list";
import type { AiPersonaConfig } from "$lib/types/ai-persona";
import type { AdapterAccount } from "@auth/core/adapters";

export const roleEnum = pgEnum("role", ["admin", "premium", "standard"]);

/** Admin-authored system messages; user copies live in `user_notifications`. */
export const notificationKindEnum = pgEnum("notification_kind", [
	"announcement",
	"information",
	"alert",
	"reminder",
]);

export const users = pgTable("user", {
	id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
	name: text("name"),
	email: text("email").notNull().unique(),
	emailVerified: timestamp("emailVerified", { mode: "date" }),
	image: text("image"),
	role: roleEnum("role").default("standard").notNull(), // Defaults to standard
});

export const accounts = pgTable(
	"account",
	{
		userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
		type: text("type").$type<AdapterAccount["type"]>().notNull(),
		provider: text("provider").notNull(),
		providerAccountId: text("providerAccountId").notNull(),
		refresh_token: text("refresh_token"),
		access_token: text("access_token"),
		expires_at: integer("expires_at"),
		token_type: text("token_type"),
		scope: text("scope"),
		id_token: text("id_token"),
		session_state: text("session_state"),
	},
	(account) => ({
		compoundKey: primaryKey({ columns: [account.provider, account.providerAccountId] }),
	})
);

export const sessions = pgTable("session", {
	sessionToken: text("sessionToken").primaryKey(),
	userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
	expires: timestamp("expires", { mode: "date" }).notNull(),
});

/** Typed payload stored in `notes.metadata` (JSONB). Extend as features grow. */
export interface NoteMetadata {
	status?: string;
	tags?: string[];
	priority?: number;
}

export const projects = pgTable(
	"projects",
	{
		id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
		ownerId: text("owner_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		description: text("description"),
		createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
	},
	(t) => [
		index("projects_owner_id_idx").on(t.ownerId),
	]
);

export const notes = pgTable(
	"notes",
	{
		id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
		ownerId: text("owner_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		/** Nullable: `NULL` = note lives in the implicit "General" workspace (no project). */
		projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
		title: text("title").notNull().default(""),
		/** Short plain-text blurb under the title (not JSON metadata). */
		description: text("description").notNull().default(""),
		body: text("body"),
		metadata: jsonb("metadata").$type<NoteMetadata>().notNull().default({}),
		createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
	},
	(t) => [
		index("notes_owner_id_idx").on(t.ownerId),
		index("notes_project_id_idx").on(t.projectId),
	]
);

export const noteLinks = pgTable(
	"note_links",
	{
		id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
		ownerId: text("owner_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		sourceNoteId: text("source_note_id")
			.notNull()
			.references(() => notes.id, { onDelete: "cascade" }),
		targetNoteId: text("target_note_id")
			.notNull()
			.references(() => notes.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
	},
	(t) => [
		uniqueIndex("note_links_source_target_uidx").on(t.sourceNoteId, t.targetNoteId),
		index("note_links_owner_id_idx").on(t.ownerId),
		index("note_links_source_note_id_idx").on(t.sourceNoteId),
		index("note_links_target_note_id_idx").on(t.targetNoteId),
	]
);

/** Row shape for `projects` — matches Drizzle schema (strict sync with Postgres / local replica). */
export type Project = InferSelectModel<typeof projects>;
export type NewProject = InferInsertModel<typeof projects>;

/** Row shape for `notes` — matches Drizzle schema (strict sync with Postgres / local replica). */
export type Note = InferSelectModel<typeof notes>;
export type NewNote = InferInsertModel<typeof notes>;

export type NoteLink = InferSelectModel<typeof noteLinks>;
export type NewNoteLink = InferInsertModel<typeof noteLinks>;

export type { SmartListItemRow, SmartListMetadata };

export const smartLists = pgTable(
	"smart_lists",
	{
		id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
		ownerId: text("owner_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		/** Nullable: list lives in General when null — same silo rules as notes */
		projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
		title: text("title").notNull().default(""),
		description: text("description"),
		items: jsonb("items").$type<SmartListItemRow[]>().notNull().default([]),
		metadata: jsonb("metadata").$type<SmartListMetadata>().notNull().default({}),
		createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
	},
	(t) => [
		index("smart_lists_owner_id_idx").on(t.ownerId),
		index("smart_lists_project_id_idx").on(t.projectId),
	]
);

export type SmartList = InferSelectModel<typeof smartLists>;
export type NewSmartList = InferInsertModel<typeof smartLists>;

/**
 * Admin-managed system prompts and metadata for on-device / local AI features.
 * `slug` is the stable integration key (summarization, recipe flows, etc.).
 */
export const aiPersonas = pgTable(
	"ai_personas",
	{
		id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
		/** URL-safe unique key, e.g. `note-summarizer` */
		slug: text("slug").notNull().unique(),
		name: text("name").notNull(),
		description: text("description"),
		systemPrompt: text("system_prompt").notNull(),
		capabilityTags: jsonb("capability_tags").$type<string[]>().notNull().default([]),
		config: jsonb("config").$type<AiPersonaConfig>().notNull().default({}),
		sortOrder: integer("sort_order").notNull().default(0),
		isActive: boolean("is_active").notNull().default(true),
		createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
	},
	(t) => [
		index("ai_personas_sort_order_idx").on(t.sortOrder),
		index("ai_personas_is_active_idx").on(t.isActive),
	],
);

export type AiPersona = InferSelectModel<typeof aiPersonas>;
export type NewAiPersona = InferInsertModel<typeof aiPersonas>;

/** v1 audience spec — extend with new `scope` values without breaking old rows. */
export type NotificationAudienceV1 =
	| { version: 1; scope: "all" }
	| { version: 1; scope: "roles"; roles: ("admin" | "premium" | "standard")[] }
	| { version: 1; scope: "users"; userIds: string[] }
	| { version: 1; scope: "group"; groupId: string };

/** v1 schedule — `once` delivers immediately; `recurring` uses UTC slot fields. */
export type NotificationScheduleV1 =
	| { version: 1; mode: "once" }
	| {
			version: 1;
			mode: "recurring";
			interval: "daily" | "weekly" | "monthly";
			hourUtc: number;
			minuteUtc: number;
			/** weekly: 0 = Sunday … 6 = Saturday (UTC) */
			weekdayUtc?: number;
			/** monthly: 1–28 (clamped to month length at fire time) */
			dayOfMonth?: number;
	  };

export const notificationGroups = pgTable(
	"notification_groups",
	{
		id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
		name: text("name").notNull(),
		memberUserIds: jsonb("member_user_ids").$type<string[]>().notNull().default([]),
		createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
	},
	(t) => [index("notification_groups_name_idx").on(t.name)],
);

export const notificationCampaigns = pgTable(
	"notification_campaigns",
	{
		id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
		title: text("title").notNull(),
		body: text("body").notNull(),
		kind: notificationKindEnum("kind").notNull(),
		audience: jsonb("audience").$type<NotificationAudienceV1>().notNull(),
		schedule: jsonb("schedule").$type<NotificationScheduleV1>().notNull(),
		isRecurring: boolean("is_recurring").notNull().default(false),
		nextFireAt: timestamp("next_fire_at", { mode: "date" }),
		lastFiredAt: timestamp("last_fired_at", { mode: "date" }),
		isActive: boolean("is_active").notNull().default(true),
		lastRecipientCount: integer("last_recipient_count"),
		createdByUserId: text("created_by_user_id")
			.notNull()
			.references(() => users.id, { onDelete: "restrict" }),
		createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
	},
	(t) => [
		index("notification_campaigns_active_next_fire_idx").on(t.isActive, t.nextFireAt),
		index("notification_campaigns_created_by_idx").on(t.createdByUserId),
	],
);

export const userNotifications = pgTable(
	"user_notifications",
	{
		id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		campaignId: text("campaign_id").references(() => notificationCampaigns.id, {
			onDelete: "set null",
		}),
		title: text("title").notNull(),
		body: text("body").notNull(),
		kind: notificationKindEnum("kind").notNull(),
		readAt: timestamp("read_at", { mode: "date" }),
		linkUrl: text("link_url"),
		payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
		createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
	},
	(t) => [
		index("user_notifications_user_created_idx").on(t.userId, t.createdAt),
		index("user_notifications_user_unread_idx").on(t.userId, t.readAt),
	],
);

export type NotificationGroup = InferSelectModel<typeof notificationGroups>;
export type NewNotificationGroup = InferInsertModel<typeof notificationGroups>;
export type NotificationCampaign = InferSelectModel<typeof notificationCampaigns>;
export type NewNotificationCampaign = InferInsertModel<typeof notificationCampaigns>;
export type UserNotification = InferSelectModel<typeof userNotifications>;
export type NewUserNotification = InferInsertModel<typeof userNotifications>;
