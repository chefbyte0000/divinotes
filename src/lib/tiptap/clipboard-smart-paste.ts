import type { Editor } from "@tiptap/core";
import {
	isTrivialClipboardHtml,
	looksLikeMarkdown,
	markdownToSafeHtml,
	sanitizeClipboardHtml,
} from "./markdown-paste";

/**
 * Rich paste + Markdown paste for TipTap `editorProps.handlePaste`.
 * Returns true when the event was consumed (caller should not run defaults).
 */
export function clipboardSmartPaste(editor: Editor, event: ClipboardEvent): boolean {
	const cd = event.clipboardData;
	if (!cd) return false;

	const plain = cd.getData("text/plain") ?? "";
	const html = cd.getData("text/html") ?? "";

	if (!plain.trim()) {
		// Image-only or exotic clipboard — let TipTap / browser handle
		return false;
	}

	// Markdown from editors / ChatGPT / docs as plain text
	if (looksLikeMarkdown(plain) && (!html.trim() || isTrivialClipboardHtml(html))) {
		event.preventDefault();
		const safe = markdownToSafeHtml(plain);
		editor.chain().focus().insertContent(safe).run();
		return true;
	}

	// Styled HTML from browsers / Notion / Google — sanitize heavily
	if (html.trim() && !isTrivialClipboardHtml(html)) {
		event.preventDefault();
		const safe = sanitizeClipboardHtml(html);
		editor.chain().focus().insertContent(safe).run();
		return true;
	}

	return false;
}

/** TipTap `transformPastedHTML` hook — always sanitize third-party HTML. */
export function transformPastedHtmlSanitize(html: string): string {
	return sanitizeClipboardHtml(html);
}
