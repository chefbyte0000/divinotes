import type { LocalUserProfile } from "$lib/profile/local-user-profile-types";
import type { NoteMetadata, SmartListMetadata } from "$lib/server/db/schema";
import type { TelemetryEventRow } from "$lib/telemetry/local-telemetry-schema";

export type ArchivedProjectRow = {
	id: string;
	ownerId: string;
	name: string;
	description: string | null;
	createdAt: string | Date;
	updatedAt: string | Date;
};

export type ArchivedNoteRow = {
	id: string;
	ownerId: string;
	projectId: string | null;
	title: string;
	body: string | null;
	metadata: NoteMetadata;
	createdAt: string | Date;
	updatedAt: string | Date;
};

export type ArchivedNoteLinkRow = {
	id: string;
	ownerId: string;
	sourceNoteId: string;
	targetNoteId: string;
	createdAt: string | Date;
};

export type ArchivedSmartListRow = {
	id: string;
	ownerId: string;
	projectId: string | null;
	title: string;
	description: string | null;
	items: unknown[];
	metadata: SmartListMetadata;
	createdAt: string | Date;
	updatedAt: string | Date;
};

export type FullArchivePayloadV1 = {
	version: 1;
	exportedAt: string;
	projects: ArchivedProjectRow[];
	notes: ArchivedNoteRow[];
	noteLinks: ArchivedNoteLinkRow[];
	smartLists: ArchivedSmartListRow[];
};

export type LocalHabitsExport = {
	telemetryEvents: TelemetryEventRow[];
	userProfile: LocalUserProfile | null;
};

export type AccountZipManifest = FullArchivePayloadV1 & {
	local?: LocalHabitsExport;
};
