import DOMPurify from "dompurify";
import { marked } from "marked";

marked.setOptions({
	gfm: true,
	breaks: true,
});

const PURIFY_CONFIG: Parameters<typeof DOMPurify.sanitize>[1] = {
	ADD_TAGS: ["iframe"], // none — explicit allow list below via ALLOWED_TAGS pattern
	ALLOW_DATA_ATTR: false,
	ALLOWED_TAGS: [
		"p",
		"br",
		"strong",
		"b",
		"em",
		"i",
		"del",
		"s",
		"code",
		"pre",
		"h1",
		"h2",
		"h3",
		"h4",
		"ul",
		"ol",
		"li",
		"blockquote",
		"a",
		"hr",
		"table",
		"thead",
		"tbody",
		"tr",
		"th",
		"td",
	],
	ALLOWED_ATTR: ["href", "title", "class"],
};

/** Detect pasted plain text that is likely Markdown (not exhaustive — avoids hijacking normal prose). */
export function looksLikeMarkdown(text: string): boolean {
	const t = text.trim();
	if (t.length < 4) return false;
	return (
		/^#{1,3}\s/m.test(t) ||
		/^>\s/m.test(t) ||
		/^(\s*[-*+]|\s*\d+\.)\s/m.test(t) ||
		/```/.test(t) ||
		/\*\*[^*]+\*\*/.test(t) ||
		/\[[^\]]+\]\([^)]+\)/.test(t) ||
		/^(\s*)([-*_]){3,}\s*$/m.test(t) ||
		/\|[^\n]+\|/.test(t)
	);
}

/** Strip wrappers browsers use when plain text is “also” HTML (VS Code, some terminals). */
export function isTrivialClipboardHtml(html: string): boolean {
	const h = html.trim();
	if (h.length < 12) return true;
	if (/^<meta\s+charset=/i.test(h)) return true;
	if (/^<!--.*?-->\s*<style/i.test(h)) return false;
	const stripped = h.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, "");
	return stripped.trim().length < 8;
}

export function markdownToSafeHtml(markdown: string): string {
	const raw = marked.parse(markdown, { async: false }) as string;
	return DOMPurify.sanitize(raw, PURIFY_CONFIG);
}

export function sanitizeClipboardHtml(html: string): string {
	return DOMPurify.sanitize(html, PURIFY_CONFIG);
}
