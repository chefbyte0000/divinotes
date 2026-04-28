import type { JSONContent } from "@tiptap/core";

const fallback: JSONContent = {
	type: "doc",
	content: [{ type: "paragraph" }],
};

/** Parse stored `notes.body` text — expects JSON string from TipTap `getJSON()`. */
export function parseNoteBody(raw: string | null | undefined): JSONContent {
	if (raw == null || raw === "") return fallback;
	try {
		const j = JSON.parse(raw) as JSONContent;
		if (j?.type === "doc") return j;
	} catch {
		/* legacy plain text */
		return {
			type: "doc",
			content: [{ type: "paragraph", content: [{ type: "text", text: raw }] }],
		};
	}
	return fallback;
}
