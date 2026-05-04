import type { Editor, Range } from "@tiptap/core";

export type SlashMenuItem = {
	id: string;
	label: string;
	description?: string;
	keywords: string[];
	/** Pick icon hint for renderer (optional) */
	group: "text" | "structure" | "list" | "insert" | "code" | "ai";
	run: (editor: Editor, range: Range) => void;
};

export type SlashAIActions = {
	summarize?: () => void;
	organizeNote?: () => void;
};

function delRangeThen(editor: Editor, range: Range, fn: () => void): void {
	editor.chain().focus().deleteRange(range).run();
	fn();
}

export function buildSlashMenuItems(editor: Editor, aiActions?: SlashAIActions): SlashMenuItem[] {
	const items: SlashMenuItem[] = [
		{
			id: "h1",
			label: "Heading 1",
			keywords: ["title", "h1"],
			group: "structure",
			run: (ed, range) => delRangeThen(ed, range, () => ed.chain().focus().toggleHeading({ level: 1 }).run()),
		},
		{
			id: "h2",
			label: "Heading 2",
			keywords: ["subtitle", "h2"],
			group: "structure",
			run: (ed, range) => delRangeThen(ed, range, () => ed.chain().focus().toggleHeading({ level: 2 }).run()),
		},
		{
			id: "h3",
			label: "Heading 3",
			keywords: ["h3"],
			group: "structure",
			run: (ed, range) => delRangeThen(ed, range, () => ed.chain().focus().toggleHeading({ level: 3 }).run()),
		},
		{
			id: "paragraph",
			label: "Paragraph",
			keywords: ["text", "normal"],
			group: "text",
			run: (ed, range) => delRangeThen(ed, range, () => void ed.chain().focus().setParagraph().run()),
		},
		{
			id: "bullet",
			label: "Bullet list",
			keywords: ["ul", "unordered"],
			group: "list",
			run: (ed, range) => delRangeThen(ed, range, () => ed.chain().focus().toggleBulletList().run()),
		},
		{
			id: "ordered",
			label: "Numbered list",
			keywords: ["ol", "numbered"],
			group: "list",
			run: (ed, range) => delRangeThen(ed, range, () => ed.chain().focus().toggleOrderedList().run()),
		},
		{
			id: "task",
			label: "Task list",
			keywords: ["todo", "checkbox"],
			group: "list",
			run: (ed, range) => delRangeThen(ed, range, () => ed.chain().focus().toggleTaskList().run()),
		},
		{
			id: "quote",
			label: "Quote",
			keywords: ["blockquote"],
			group: "structure",
			run: (ed, range) => delRangeThen(ed, range, () => ed.chain().focus().toggleBlockquote().run()),
		},
		{
			id: "divider",
			label: "Divider",
			keywords: ["hr", "horizontal", "rule"],
			group: "insert",
			run: (ed, range) => delRangeThen(ed, range, () => ed.chain().focus().setHorizontalRule().run()),
		},
		{
			id: "bold",
			label: "Bold",
			keywords: ["strong"],
			group: "text",
			run: (ed, range) => delRangeThen(ed, range, () => ed.chain().focus().toggleBold().run()),
		},
		{
			id: "italic",
			label: "Italic",
			keywords: ["emphasis"],
			group: "text",
			run: (ed, range) => delRangeThen(ed, range, () => ed.chain().focus().toggleItalic().run()),
		},
		{
			id: "strike",
			label: "Strikethrough",
			keywords: [],
			group: "text",
			run: (ed, range) => delRangeThen(ed, range, () => ed.chain().focus().toggleStrike().run()),
		},
		{
			id: "underline",
			label: "Underline",
			keywords: [],
			group: "text",
			run: (ed, range) => delRangeThen(ed, range, () => ed.chain().focus().toggleUnderline().run()),
		},
		{
			id: "code",
			label: "Inline code",
			keywords: [],
			group: "text",
			run: (ed, range) => delRangeThen(ed, range, () => ed.chain().focus().toggleCode().run()),
		},
		{
			id: "highlight",
			label: "Highlight",
			keywords: ["mark"],
			group: "text",
			run: (ed, range) => delRangeThen(ed, range, () => ed.chain().focus().toggleHighlight().run()),
		},
		{
			id: "link",
			label: "Link",
			keywords: ["url", "href"],
			group: "insert",
			run: (ed, range) => {
				ed.chain().focus().deleteRange(range).run();
				const prev = ed.getAttributes("link").href as string | undefined;
				const url = window.prompt("Link URL", prev ?? "https://");
				if (url === null) return;
				if (url === "") ed.chain().focus().unsetLink().run();
				else ed.chain().focus().setLink({ href: url }).run();
			},
		},
		{
			id: "align-left",
			label: "Align left",
			keywords: [],
			group: "text",
			run: (ed, range) => delRangeThen(ed, range, () => ed.chain().focus().setTextAlign("left").run()),
		},
		{
			id: "align-center",
			label: "Align center",
			keywords: [],
			group: "text",
			run: (ed, range) => delRangeThen(ed, range, () => ed.chain().focus().setTextAlign("center").run()),
		},
		{
			id: "align-right",
			label: "Align right",
			keywords: [],
			group: "text",
			run: (ed, range) => delRangeThen(ed, range, () => ed.chain().focus().setTextAlign("right").run()),
		},
	];

	const langs: { id: string; label: string; language: string; keywords: string[] }[] = [
		{ id: "code-plain", label: "Code block (plain)", language: "plaintext", keywords: ["code", "snippet"] },
		{ id: "code-ts", label: "Code · TypeScript", language: "typescript", keywords: ["ts"] },
		{ id: "code-js", label: "Code · JavaScript", language: "javascript", keywords: ["js"] },
		{ id: "code-py", label: "Code · Python", language: "python", keywords: ["py"] },
		{ id: "code-rs", label: "Code · Rust", language: "rust", keywords: [] },
		{ id: "code-go", label: "Code · Go", language: "go", keywords: ["golang"] },
		{ id: "code-sh", label: "Code · Bash", language: "bash", keywords: ["shell", "sh"] },
		{ id: "code-json", label: "Code · JSON", language: "json", keywords: [] },
		{ id: "code-html", label: "Code · HTML", language: "html", keywords: [] },
		{ id: "code-css", label: "Code · CSS", language: "css", keywords: [] },
		{ id: "code-sql", label: "Code · SQL", language: "sql", keywords: [] },
		{ id: "code-svelte", label: "Code · Svelte", language: "svelte", keywords: [] },
	];

	for (const L of langs) {
		items.push({
			id: L.id,
			label: L.label,
			keywords: L.keywords,
			group: "code",
			run: (ed, range) =>
				delRangeThen(ed, range, () => ed.chain().focus().toggleCodeBlock({ language: L.language }).run()),
		});
	}

	if (aiActions?.summarize) {
		items.unshift({
			id: "ai-summarize",
			label: "Summarize",
			description: "Generate a local AI summary of this note",
			keywords: ["ai", "summary", "recap", "tldr"],
			group: "ai",
			run: (ed, range) =>
				delRangeThen(ed, range, () => {
					aiActions.summarize?.();
				}),
		});
	}

	if (aiActions?.organizeNote) {
		items.unshift({
			id: "ai-organize-note",
			label: "Organize note",
			description: "Restructure this note with intent-aware local AI",
			keywords: ["ai", "organize", "restructure", "clarify", "rewrite"],
			group: "ai",
			run: (ed, range) =>
				delRangeThen(ed, range, () => {
					aiActions.organizeNote?.();
				}),
		});
	}

	return items;
}

export function filterSlashItems(items: SlashMenuItem[], query: string): SlashMenuItem[] {
	const q = query.trim().toLowerCase();
	if (!q) return items.slice(0, 36);
	return items
		.filter(
			(i) =>
				i.label.toLowerCase().includes(q) ||
				i.id.includes(q) ||
				i.keywords.some((k) => k.includes(q)),
		)
		.slice(0, 36);
}
