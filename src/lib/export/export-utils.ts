import type { JSONContent } from "@tiptap/core";

/** TipTap / ProseMirror → CommonMark-oriented Markdown (portable interchange). */

function escapeInlinePlain(text: string): string {
	return text.replace(/\\/g, "\\\\").replace(/\*/g, "\\*").replace(/_/g, "\\_").replace(/`/g, "\\`");
}

function escapeInlineForCode(text: string): string {
	return text.replace(/\\/g, "\\\\").replace(/`/g, "\\`");
}

type WalkCtx = {
	listDepth: number;
	orderedCounterStack: number[];
};

function applyMarks(text: string, marks: NonNullable<JSONContent["marks"]> | undefined): string {
	if (!marks?.length) return escapeInlinePlain(text);
	let s = text;
	const ordered = [...marks].sort((a, b) => markOrder(a.type) - markOrder(b.type));
	for (const m of ordered) {
		switch (m.type) {
			case "code":
				s = "`" + escapeInlineForCode(s) + "`";
				break;
			case "bold":
				s = `**${s}**`;
				break;
			case "italic":
				s = `*${s}*`;
				break;
			case "strike":
				s = `~~${s}~~`;
				break;
			case "underline":
				s = `<u>${escapeInlinePlain(s)}</u>`;
				break;
			case "highlight":
				s = `==${escapeInlinePlain(s)}==`;
				break;
			case "link": {
				const href = String((m.attrs as { href?: string } | undefined)?.href ?? "");
				const safe = href.replace(/[()]/g, "\\$&");
				s = `[${escapeInlinePlain(s)}](${safe})`;
				break;
			}
			case "subscript":
				s = `<sub>${escapeInlinePlain(s)}</sub>`;
				break;
			case "superscript":
				s = `<sup>${escapeInlinePlain(s)}</sup>`;
				break;
			default:
				break;
		}
	}
	return s;
}

function markOrder(type: string): number {
	const order: Record<string, number> = {
		link: 0,
		code: 1,
		bold: 2,
		italic: 3,
		underline: 4,
		strike: 5,
		highlight: 6,
		subscript: 7,
		superscript: 8,
	};
	return order[type] ?? 99;
}

function inlineFromContent(nodes: JSONContent[] | undefined): string {
	if (!nodes?.length) return "";
	const parts: string[] = [];
	for (const n of nodes) {
		if (n.type === "text") {
			parts.push(applyMarks(n.text ?? "", n.marks));
		} else if (n.type === "hardBreak") {
			parts.push("  \n");
		} else if (n.type === "mention") {
			const id = String((n.attrs as { id?: string; label?: string } | undefined)?.id ?? "");
			const label =
				String((n.attrs as { label?: string } | undefined)?.label ?? "").trim() || id || "note";
			parts.push(`[[${label}]]`);
		}
	}
	return parts.join("");
}

function indentPrefix(depth: number): string {
	return "  ".repeat(Math.max(0, depth));
}

function blockToMarkdown(node: JSONContent | undefined, ctx: WalkCtx): string {
	if (!node) return "";

	switch (node.type) {
		case "paragraph":
			return indentPrefix(ctx.listDepth) + inlineFromContent(node.content);
		case "heading": {
			const level = Math.min(6, Math.max(1, Number((node.attrs as { level?: number })?.level ?? 1)));
			const hashes = "#".repeat(level);
			return `${hashes} ${inlineFromContent(node.content)}`;
		}
		case "blockquote": {
			const inner = (node.content ?? [])
				.map((c) => blockToMarkdown(c, { ...ctx, listDepth: 0 }))
				.join("\n\n");
			return inner
				.split("\n")
				.map((line) => `${indentPrefix(ctx.listDepth)}> ${line}`)
				.join("\n");
		}
		case "codeBlock": {
			const lang = String((node.attrs as { language?: string } | undefined)?.language ?? "");
			const raw = collectPlainText(node);
			return "```" + lang + "\n" + raw + "\n```";
		}
		case "horizontalRule":
			return indentPrefix(ctx.listDepth) + "---";
		case "bulletList": {
			const items = node.content ?? [];
			const lines: string[] = [];
			for (const item of items) {
				if (item.type !== "listItem") continue;
				const body = listItemBodyMarkdown(item, {
					...ctx,
					listDepth: ctx.listDepth,
					orderedCounterStack: [...ctx.orderedCounterStack],
				});
				const prefixed = body.split("\n").map((line, i) =>
					i === 0
						? `${indentPrefix(ctx.listDepth)}- ${line}`
						: `${indentPrefix(ctx.listDepth)}  ${line}`,
				);
				lines.push(prefixed.join("\n"));
			}
			return lines.join("\n");
		}
		case "orderedList": {
			const items = node.content ?? [];
			const lines: string[] = [];
			let n = 1;
			for (const item of items) {
				if (item.type !== "listItem") continue;
				const body = listItemBodyMarkdown(item, {
					...ctx,
					listDepth: ctx.listDepth,
					orderedCounterStack: [...ctx.orderedCounterStack, n],
				});
				const prefix = `${n}.`;
				n += 1;
				const prefixed = body.split("\n").map((line, i) =>
					i === 0
						? `${indentPrefix(ctx.listDepth)}${prefix} ${line}`
						: `${indentPrefix(ctx.listDepth)}   ${line}`,
				);
				lines.push(prefixed.join("\n"));
			}
			return lines.join("\n");
		}
		case "taskList": {
			const items = node.content ?? [];
			const lines: string[] = [];
			for (const item of items) {
				if (item.type !== "taskItem") continue;
				const checked = Boolean((item.attrs as { checked?: boolean } | undefined)?.checked);
				const box = checked ? "[x]" : "[ ]";
				const inner = listItemBodyMarkdown(item, {
					...ctx,
					listDepth: ctx.listDepth,
					orderedCounterStack: [...ctx.orderedCounterStack],
				});
				const linesInner = inner.split("\n");
				const firstLine = linesInner[0] ?? "";
				const rest = linesInner.slice(1);
				const head = `${indentPrefix(ctx.listDepth)}- ${box} ${firstLine}`;
				const tail = rest.map((line) => `${indentPrefix(ctx.listDepth)}  ${line}`).join("\n");
				lines.push(tail ? `${head}\n${tail}` : head);
			}
			return lines.join("\n");
		}
		default:
			return "";
	}
}

function listItemBodyMarkdown(item: JSONContent, ctx: WalkCtx): string {
	const chunks: string[] = [];
	const children = item.content ?? [];
	const nestedDepth =
		item.type === "listItem" || item.type === "taskItem" ? ctx.listDepth + 1 : ctx.listDepth;
	for (const child of children) {
		if (child.type === "paragraph") {
			chunks.push(inlineFromContent(child.content));
		} else if (
			child.type === "bulletList" ||
			child.type === "orderedList" ||
			child.type === "taskList"
		) {
			chunks.push(
				blockToMarkdown(child, {
					...ctx,
					listDepth: nestedDepth,
				}),
			);
		} else {
			chunks.push(blockToMarkdown(child, { ...ctx, listDepth: nestedDepth }));
		}
	}
	return chunks.filter((s) => s.length > 0).join("\n");
}

function collectPlainText(node: JSONContent | undefined): string {
	if (!node) return "";
	if (node.type === "text") return node.text ?? "";
	return (node.content ?? []).map(collectPlainText).join(node.type === "paragraph" ? "\n" : "");
}

/**
 * Convert TipTap document JSON (see `parseNoteBody`) to Markdown.
 */
export function tiptapJsonToMarkdown(doc: JSONContent | null | undefined): string {
	if (!doc || doc.type !== "doc") return "";
	const ctx: WalkCtx = { listDepth: 0, orderedCounterStack: [] };
	const blocks = (doc.content ?? [])
		.map((n) => blockToMarkdown(n, ctx))
		.filter((s) => s.length > 0);
	const body = blocks.join("\n\n").trim();
	return body ? `${body}\n` : "";
}
