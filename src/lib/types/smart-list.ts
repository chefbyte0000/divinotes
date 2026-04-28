/** Row in `smart_lists.items` — shared types (safe for client + server). */
export interface SmartListItemRow {
	id: string;
	text: string;
	done?: boolean;
	tags?: string[];
	due?: string | null;
	lane?: string;
}

export interface SmartListMetadata {
	view?: "checklist" | "board" | "table";
	aiFocus?: string;
}
