/** Mirrors `NoteMetadata` without importing server schema into client bundles. */
export type ProjectNoteMetadata = {
	status?: string;
	tags?: string[];
	priority?: number;
};

/** Note row for project list / kanban views (serialized from `+page.server`). */
export type ProjectNoteRow = {
	id: string;
	title: string;
	description: string;
	updatedAt: string | Date;
	metadata: ProjectNoteMetadata;
};
