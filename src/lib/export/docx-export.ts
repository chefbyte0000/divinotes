import type { JSONContent } from "@tiptap/core";
import {
	AlignmentType,
	convertInchesToTwip,
	Document,
	HeadingLevel,
	LevelFormat,
	Packer,
	PageBreak,
	Paragraph,
	TextRun,
} from "docx";

function headingFromLevel(level: number): (typeof HeadingLevel)[keyof typeof HeadingLevel] {
	switch (Math.min(6, Math.max(1, level))) {
		case 1:
			return HeadingLevel.HEADING_1;
		case 2:
			return HeadingLevel.HEADING_2;
		case 3:
			return HeadingLevel.HEADING_3;
		case 4:
			return HeadingLevel.HEADING_4;
		case 5:
			return HeadingLevel.HEADING_5;
		default:
			return HeadingLevel.HEADING_6;
	}
}

function textRunsFromInlineNodes(nodes: JSONContent[] | undefined): TextRun[] {
	const runs: TextRun[] = [];
	for (const n of nodes ?? []) {
		if (n.type === "text") {
			const props: Record<string, unknown> = { text: n.text ?? "" };
			for (const m of n.marks ?? []) {
				switch (m.type) {
					case "bold":
						props.bold = true;
						break;
					case "italic":
						props.italics = true;
						break;
					case "strike":
						props.strike = true;
						break;
					case "underline":
						break;
					case "code":
						props.font = "Courier New";
						break;
					case "highlight":
						props.highlight = "yellow";
						break;
					default:
						break;
				}
			}
			runs.push(new TextRun(props as ConstructorParameters<typeof TextRun>[0]));
		} else if (n.type === "hardBreak") {
			runs.push(new TextRun({ break: 1 }));
		} else if (n.type === "mention") {
			const id = String((n.attrs as { id?: string; label?: string } | undefined)?.id ?? "");
			const label =
				String((n.attrs as { label?: string } | undefined)?.label ?? "").trim() || id || "note";
			runs.push(new TextRun({ text: `[[${label}]]`, italics: true }));
		}
	}
	return runs.length ? runs : [new TextRun("")];
}

function collectCodePlain(node: JSONContent | undefined): string {
	if (!node) return "";
	if (node.type === "text") return node.text ?? "";
	return (node.content ?? []).map(collectCodePlain).join("");
}

const numberingConfig = {
	config: [
		{
			reference: "divinotes-bullet",
			levels: [
				{
					level: 0,
					format: LevelFormat.BULLET,
					text: "\u2022",
					alignment: AlignmentType.LEFT,
					style: {
						paragraph: {
							indent: {
								left: convertInchesToTwip(0.45),
								hanging: convertInchesToTwip(0.22),
							},
						},
					},
				},
			],
		},
		{
			reference: "divinotes-ordered",
			levels: [
				{
					level: 0,
					format: LevelFormat.DECIMAL,
					text: "%1.",
					alignment: AlignmentType.LEFT,
					style: {
						paragraph: {
							indent: {
								left: convertInchesToTwip(0.45),
								hanging: convertInchesToTwip(0.22),
							},
						},
					},
				},
			],
		},
	],
} as const;

/** Flatten first paragraph of a list item; nested lists become plain text placeholders (full fidelity → Markdown). */
function listItemPrimaryRuns(item: JSONContent): TextRun[] {
	for (const child of item.content ?? []) {
		if (child.type === "paragraph") {
			return textRunsFromInlineNodes(child.content);
		}
	}
	return [new TextRun("")];
}

function blocksToDocx(children: JSONContent[] | undefined): Paragraph[] {
	const out: Paragraph[] = [];
	for (const node of children ?? []) {
		switch (node.type) {
			case "paragraph":
				out.push(new Paragraph({ children: textRunsFromInlineNodes(node.content) }));
				break;
			case "heading": {
				const lv = Number((node.attrs as { level?: number } | undefined)?.level ?? 1);
				out.push(
					new Paragraph({
						heading: headingFromLevel(lv),
						children: textRunsFromInlineNodes(node.content),
					}),
				);
				break;
			}
			case "blockquote":
				out.push(...blocksToDocx(node.content));
				break;
			case "codeBlock": {
				const body = collectCodePlain(node);
				out.push(
					new Paragraph({
						children: [new TextRun({ text: body, font: "Courier New", size: 20 })],
					}),
				);
				break;
			}
			case "horizontalRule":
				out.push(new Paragraph({ children: [new TextRun("────────")] }));
				break;
			case "bulletList":
				for (const item of node.content ?? []) {
					if (item.type !== "listItem") continue;
					const runs = listItemPrimaryRuns(item);
					out.push(
						new Paragraph({
							numbering: { reference: "divinotes-bullet", level: 0 },
							children: runs,
						}),
					);
				}
				break;
			case "orderedList":
				for (const item of node.content ?? []) {
					if (item.type !== "listItem") continue;
					const runs = listItemPrimaryRuns(item);
					out.push(
						new Paragraph({
							numbering: { reference: "divinotes-ordered", level: 0 },
							children: runs,
						}),
					);
				}
				break;
			case "taskList":
				for (const item of node.content ?? []) {
					if (item.type !== "taskItem") continue;
					const checked = Boolean((item.attrs as { checked?: boolean } | undefined)?.checked);
					const box = checked ? "[x]" : "[ ]";
					const inner = listItemPrimaryRuns(item);
					out.push(new Paragraph({ children: [new TextRun(`${box} `), ...inner] }));
				}
				break;
			default:
				break;
		}
	}
	return out;
}

export async function tiptapJsonToDocxBlob(doc: JSONContent | null | undefined): Promise<Blob> {
	const root = doc?.type === "doc" ? doc.content : [];
	const children = blocksToDocx(root);
	return packParagraphs(children);
}

async function packParagraphs(paragraphs: Paragraph[]): Promise<Blob> {
	const file = new Document({
		numbering: numberingConfig,
		sections: [{ children: paragraphs.length ? paragraphs : [new Paragraph("")] }],
	});
	return Packer.toBlob(file);
}

/** Multiple rooted TipTap docs with explicit Word page breaks between them (project stitch). */
export async function stitchTipTapJsonContentsToDocxBlob(contents: JSONContent[]): Promise<Blob> {
	const merged: Paragraph[] = [];
	for (let i = 0; i < contents.length; i++) {
		const doc = contents[i];
		const root = doc?.type === "doc" ? doc.content : [];
		const paras = blocksToDocx(root);
		merged.push(...paras);
		if (i < contents.length - 1) {
			merged.push(new Paragraph({ children: [new PageBreak()] }));
		}
	}
	return packParagraphs(merged);
}
