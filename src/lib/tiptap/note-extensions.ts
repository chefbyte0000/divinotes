import { mergeAttributes } from "@tiptap/core";
import CharacterCount from "@tiptap/extension-character-count";
import CodeBlock from "@tiptap/extension-code-block";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Mention from "@tiptap/extension-mention";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { PluginKey } from "@tiptap/pm/state";

import { createWikiSuggestionRenderer } from "./wiki-suggestion-controller";
import { SlashCommands } from "./slash-command-extension";

/** Shared TipTap bundle — block primitives, marks, wiki-links, and perf-friendly caps. */
export function createNoteExtensions(opts: {
	projectId: string | null;
	excludeNoteId: string;
}) {
	return [
		StarterKit.configure({
			heading: { levels: [1, 2, 3] },
			codeBlock: false,
			blockquote: {
				HTMLAttributes: {
					class:
						"border-border text-muted-foreground my-4 border-l-[3px] pl-4 italic [&_p]:my-1",
				},
			},
			code: {
				HTMLAttributes: {
					class:
						"bg-muted rounded px-1 py-px font-mono text-[0.9em] before:content-none after:content-none",
				},
			},
			bulletList: {
				HTMLAttributes: { class: "my-3 list-disc pl-6 [&_li]:my-1" },
			},
			orderedList: {
				HTMLAttributes: { class: "my-3 list-decimal pl-6 [&_li]:my-1" },
			},
			dropcursor: { color: "var(--ring)", width: 2 },
		}),
		CodeBlock.configure({
			defaultLanguage: null,
			tabSize: 2,
			enableTabIndentation: true,
			languageClassPrefix: "language-",
			HTMLAttributes: {
				class:
					"bg-muted/80 border-border my-4 rounded-lg border p-3 font-mono text-[13px] leading-relaxed",
			},
		}),
		SlashCommands,
		TextStyle,
		TextAlign.configure({
			types: ["heading", "paragraph"],
		}),
		Underline.configure({
			HTMLAttributes: { class: "underline underline-offset-[3px]" },
		}),
		Link.configure({
			openOnClick: false,
			autolink: true,
			linkOnPaste: true,
			defaultProtocol: "https",
			HTMLAttributes: {
				class:
					"text-primary font-medium underline decoration-muted-foreground/40 underline-offset-[3px] transition-colors hover:decoration-primary",
				rel: "noopener noreferrer nofollow",
			},
		}),
		Highlight.configure({
			multicolor: false,
			HTMLAttributes: {
				class:
					"rounded-sm bg-primary/12 px-0.5 text-foreground dark:bg-primary/20",
			},
		}),
		TaskList.configure({
			HTMLAttributes: { class: "my-3 list-none pl-0 [&_li]:my-1.5" },
		}),
		TaskItem.configure({
			nested: true,
			HTMLAttributes: {
				class: "flex gap-2 [&_label]:flex [&_label]:items-start [&_label]:gap-2 [&_label]:pt-0.5",
			},
		}),
		CharacterCount.configure({
			limit: 500_000,
		}),
		Placeholder.configure({
			placeholder:
				"Start writing… Type / for blocks, [[ to link a note in this workspace.",
		}),
		Mention.configure({
			HTMLAttributes: {
				class:
					"wiki-link bg-muted/70 text-primary rounded px-1 py-px font-medium underline decoration-dotted decoration-primary/50 underline-offset-[3px]",
			},
			renderText({ node }) {
				const label = (node.attrs.label as string | null | undefined) ?? (node.attrs.id as string);
				return `[[${label}]]`;
			},
			renderHTML({ node }) {
				const id = node.attrs.id as string;
				const label = (node.attrs.label as string | undefined) ?? id ?? "Note";
				return [
					"a",
					mergeAttributes({
						href: `/note/${id}`,
						class:
							"wiki-link bg-muted/70 text-primary rounded px-1 py-px font-medium underline decoration-dotted decoration-primary/50 underline-offset-[3px]",
						"data-note-id": id,
						"data-type": "mention",
					}),
					label,
				];
			},
			suggestion: {
				char: "[",
				pluginKey: new PluginKey("wikiLink"),
				allowedPrefixes: ["["],
				items: async ({ query }) => {
					const u = new URL("/api/notes/search", window.location.origin);
					const q = query.trim();
					if (q) u.searchParams.set("q", q);
					if (opts.projectId) u.searchParams.set("projectId", opts.projectId);
					u.searchParams.set("excludeNoteId", opts.excludeNoteId);
					const r = await fetch(u.toString());
					if (!r.ok) return [];
					const data = (await r.json()) as { notes: { id: string; title: string }[] };
					return data.notes.map((n) => ({ id: n.id, label: n.title || "Untitled" }));
				},
				render: () => createWikiSuggestionRenderer(),
			},
		}),
	];
}
