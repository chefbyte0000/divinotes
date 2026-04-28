import type { JSONContent } from "@tiptap/core";

/** Collect note ids from TipTap `mention` nodes (wiki-links). */
export function extractMentionIds(doc: JSONContent | null | undefined): string[] {
	const out: string[] = [];

	function walk(node: JSONContent | undefined) {
		if (!node) return;
		if (node.type === "mention" && node.attrs && typeof node.attrs.id === "string") {
			out.push(node.attrs.id);
		}
		node.content?.forEach(walk);
	}

	walk(doc ?? undefined);
	return [...new Set(out)];
}
