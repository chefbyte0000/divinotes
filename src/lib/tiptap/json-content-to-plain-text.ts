import type { JSONContent } from "@tiptap/core";

/** Flatten TipTap JSON to plain text for search, RAG, and AI prompts. */
export function jsonContentToPlainText(doc: JSONContent | null | undefined): string {
	const parts: string[] = [];

	function walk(node: JSONContent | undefined) {
		if (!node) return;
		if (node.type === "text" && typeof node.text === "string") parts.push(node.text);
		for (const child of node.content ?? []) walk(child);
	}

	walk(doc ?? undefined);
	return parts.join(" ").replace(/\s+/g, " ").trim();
}
