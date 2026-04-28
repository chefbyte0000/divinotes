import { pgTable, text, timestamp, uuid, boolean, jsonb } from 'drizzle-orm/pg-core';

// Users & Auth
export const users = pgTable('users', {
	id: uuid('id').primaryKey().defaultRandom(),
	email: text('email').notNull().unique(),
	role: text('role', { enum: ['admin', 'standard', 'premium'] }).default('standard'),
	createdAt: timestamp('created_at').defaultNow(),
});

// Projects (Strict Folders)
export const projects = pgTable('projects', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: text('name').notNull(),
	description: text('description'),
	userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
	createdAt: timestamp('created_at').defaultNow(),
});

// Notes
export const notes = pgTable('notes', {
	id: uuid('id').primaryKey().defaultRandom(),
	title: text('title').default('Untitled'),
	content: text('content'), // This will store markdown or JSON blocks
	projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
	userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
	isFavorite: boolean('is_favorite').default(false),
	updatedAt: timestamp('updated_at').defaultNow(),
});

// AI & Habit Tracking (Telemetry)
export const activityLogs = pgTable('activity_logs', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id').references(() => users.id),
	action: text('action').notNull(), // e.g., 'created_note', 'morning_todo'
	context: jsonb('context'), // Metadata like time of day, project_id, etc.
	timestamp: timestamp('timestamp').defaultNow(),
});