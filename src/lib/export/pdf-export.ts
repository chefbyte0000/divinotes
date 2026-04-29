import { jsPDF } from "jspdf";

const FONT_PT = 11;
const LINE_MM = 5;
const MARGIN_MM = 18;
const PAGE_W_MM = 210;
const PAGE_H_MM = 297;

/** Plain-text PDF — stitches Markdown-like export without a remote renderer. */
export function markdownPlainTextToPdfBlob(markdown: string, title?: string): Blob {
	const doc = new jsPDF({ unit: "mm", format: "a4" });
	doc.setFontSize(FONT_PT);
	const maxW = PAGE_W_MM - 2 * MARGIN_MM;
	let y = MARGIN_MM;
	const lines = markdown.replace(/\r\n/g, "\n").split("\n");
	const bodyLines =
		title && title.trim()
			? [`# ${title}`, "", ...lines]
			: lines;

	for (const raw of bodyLines) {
		const wrapped = doc.splitTextToSize(raw.length ? raw : " ", maxW);
		const chunk = wrapped as string[];
		for (const line of chunk) {
			if (y > PAGE_H_MM - MARGIN_MM) {
				doc.addPage();
				y = MARGIN_MM;
			}
			doc.text(line, MARGIN_MM, y);
			y += LINE_MM;
		}
	}

	return doc.output("blob");
}
