import type { SmartListItemRow } from "$lib/types/smart-list";

export const DEFAULT_BOARD_LANES = ["To Do", "Doing", "Done"] as const;

export function newSmartListItem(text: string): SmartListItemRow {
	return {
		id: crypto.randomUUID(),
		text,
		done: false,
		lane: DEFAULT_BOARD_LANES[0],
	};
}

/** Turn a pasted outline or brainstorm into rows (offline “smart” capture). */
export function splitTextIntoItems(raw: string): SmartListItemRow[] {
	return raw
		.split(/\r?\n/)
		.map((line) =>
			line
				.replace(/^[\s\-*•]+/, "")
				.replace(/^\[[ x]\]\s*/i, "")
				.trim(),
		)
		.filter(Boolean)
		.map((text) => newSmartListItem(text));
}

export function resolveLane(item: SmartListItemRow): string {
	const lane = item.lane?.trim();
	if (lane) return lane;
	return DEFAULT_BOARD_LANES[0];
}
