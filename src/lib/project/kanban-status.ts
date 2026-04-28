/** Default columns when grouping by `metadata.status`. */
export const DEFAULT_KANBAN_STATUSES = ["To Do", "Doing", "Done"] as const;

export type DefaultKanbanStatus = (typeof DEFAULT_KANBAN_STATUSES)[number];

export function normalizeKanbanStatus(raw: string | undefined): DefaultKanbanStatus {
	if (raw && DEFAULT_KANBAN_STATUSES.includes(raw as DefaultKanbanStatus)) {
		return raw as DefaultKanbanStatus;
	}
	return "To Do";
}
