import {
	pgTable,
	text,
	timestamp,
	primaryKey,
	integer,
	pgEnum,
	jsonb,
	uniqueIndex,
	index,
} from "drizzle-orm/pg-core";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type { AdapterAccount } from "@auth/core/adapters";

export const roleEnum = pgEnum("role", ["admin", "premium", "standard"]);

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
