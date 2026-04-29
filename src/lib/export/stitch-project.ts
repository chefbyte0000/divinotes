import type { JSONContent } from "@tiptap/core";

import type { ProjectNoteMetadata } from "$lib/types/project-notes";
import { parseNoteBody } from "$lib/tiptap/parse-note-body";

import { stitchTipTapJsonContentsToDocxBlob } from "./docx-export";
import { tiptapJsonToMarkdown } from "./export-utils";
import { markdownPlainTextToPdfBlob } from "./pdf-export";

export type ProjectNoteSortMode = "alphabetical" | "created" | "manual";

/** Rows carrying TipTap JSON in `body` (same shape as server notes table columns needed for export). */
export type StitchedExportNote = {
	id: string;
	title: string;
	description: string;
	body: string | null;
	metadata: ProjectNoteMetadata;
	createdAt: string | Date;
	updatedAt: string | Date;
};

export type StitchedExportFormat = "markdown" | "docx" | "pdf";

export async function fetchProjectNotesForExport(projectId: string): Promise<StitchedExportNote[]> {
	const r = await fetch(`/api/projects/${encodeURIComponent(projectId)}/export-notes`);
	if (!r.ok) throw new Error(`Could not load notes (${r.status})`);
	const data = (await r.json()) as { notes: StitchedExportNote[] };
	return data.notes;
}

export type StitchProjectOptions = {
	projectName?: string;
	notes: StitchedExportNote[];
	sort: ProjectNoteSortMode;
	/** Manual ordering matches sidebar order once persisted — defaults to server-provided array order. */
	orderedNoteIds?: string[];
	includeMetadata: boolean;
	/** Prepended Markdown (e.g. local AI executive summary). Optional — callers integrate Gemma later. */
	prefaceMarkdown?: string;
	format: StitchedExportFormat;
};

export function sortNotesForExport(
	notes: StitchedExportNote[],
	mode: ProjectNoteSortMode,
	orderedNoteIds?: string[],
): StitchedExportNote[] {
	const copy = [...notes];
	if (mode === "manual" && orderedNoteIds?.length) {
		const idx = new Map(orderedNoteIds.map((id, i) => [id, i]));
		copy.sort((a, b) => (idx.get(a.id) ?? 999999) - (idx.get(b.id) ?? 999999));
		return copy;
	}
	if (mode === "alphabetical") {
		copy.sort((a, b) =>
			(a.title.trim() || "Untitled").localeCompare(b.title.trim() || "Untitled", undefined, {
				sensitivity: "base",
			}),
		);
		return copy;
	}
	copy.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
	return copy;
}

function metaLines(note: StitchedExportNote): string[] {
	const tags = note.metadata.tags?.length ? note.metadata.tags.join(", ") : "";
	const desc = note.description?.trim() ?? "";
	const created =
		note.createdAt instanceof Date ? note.createdAt.toISOString() : String(note.createdAt);
	const updated =
		note.updatedAt instanceof Date ? note.updatedAt.toISOString() : String(note.updatedAt);
	const lines = [`Created: ${created}`, `Updated: ${updated}`];
	if (desc) lines.push(`Description: ${desc}`);
	if (tags) lines.push(`Tags: ${tags}`);
	if (note.metadata.status) lines.push(`Status: ${note.metadata.status}`);
	return lines;
}

export function stitchProjectToMarkdown(opts: StitchProjectOptions): string {
	const sorted = sortNotesForExport(opts.notes, opts.sort, opts.orderedNoteIds);
	const lines: string[] = [];
	if (opts.projectName?.trim()) {
		lines.push(`# ${opts.projectName.trim()}`, "");
	}
	if (opts.prefaceMarkdown?.trim()) {
		lines.push(opts.prefaceMarkdown.trim(), "", "---", "");
	}
	lines.push("## Table of contents", "");
	for (const n of sorted) {
		const t = n.title.trim() || "Untitled note";
		lines.push(`- [${t}](#note-${n.id})`);
	}
	lines.push("", "---", "");

	for (const n of sorted) {
		const title = n.title.trim() || "Untitled note";
		lines.push(`<a id="note-${n.id}"></a>`, "", `## ${title}`, "");
		const blurb = n.description?.trim() ?? "";
		if (blurb) {
			lines.push(blurb, "");
		}
		if (opts.includeMetadata) {
			lines.push(...metaLines(n).map((l) => `*${l}*`), "");
		}
		const doc = parseNoteBody(n.body);
		lines.push(tiptapJsonToMarkdown(doc).trimEnd(), "", "---", "");
	}

	return lines.join("\n").trim() + "\n";
}

export async function stitchProjectToBlob(opts: StitchProjectOptions): Promise<Blob> {
	const md = stitchProjectToMarkdown(opts);
	if (opts.format === "markdown") {
		return new Blob([md], { type: "text/markdown;charset=utf-8" });
	}
	if (opts.format === "pdf") {
		return markdownPlainTextToPdfBlob(md, opts.projectName);
	}

	const sorted = sortNotesForExport(opts.notes, opts.sort, opts.orderedNoteIds);
	const docs: JSONContent[] = [];

	const opener: JSONContent[] = [];
	if (opts.projectName?.trim()) {
		opener.push({
			type: "heading",
			attrs: { level: 1 },
			content: [{ type: "text", text: opts.projectName.trim()! }],
		});
	}
	if (opts.prefaceMarkdown?.trim()) {
		opener.push({
			type: "paragraph",
			content: [{ type: "text", text: opts.prefaceMarkdown.trim() }],
		});
	}
	if (opener.length) {
		docs.push({ type: "doc", content: opener });
	}

	for (const n of sorted) {
		const inner = parseNoteBody(n.body);
		const blocks: JSONContent[] = [
			{
				type: "heading",
				attrs: { level: 2 },
				content: [{ type: "text", text: n.title.trim() || "Untitled note" }],
			},
		];
		const exportDesc = n.description?.trim() ?? "";
		if (exportDesc) {
			blocks.push({
				type: "paragraph",
				content: [{ type: "text", text: exportDesc }],
			});
		}
		if (opts.includeMetadata) {
			blocks.push({
				type: "paragraph",
				content: [{ type: "text", text: metaLines(n).join(" · "), marks: [{ type: "italic" }] }],
			});
		}
		blocks.push(...(inner.content ?? []));
		docs.push({ type: "doc", content: blocks });
	}

	return stitchTipTapJsonContentsToDocxBlob(
		docs.length ? docs : [{ type: "doc", content: [{ type: "paragraph" }] }],
	);
}
