/** Shared normalization and merging for `notes.metadata.tags`. */

export const MAX_NOTE_TAGS = 20;

const TAG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Lowercase slug-style tags only; returns null if invalid. */
export function normalizeTagToken(raw: string): string | null {
	const s = raw
		.trim()
		.toLowerCase()
		.replace(/\s+/g, "-")
		.replace(/_/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
	if (!s || s.length > 40) return null;
	if (!TAG_REGEX.test(s)) return null;
	return s;
}

/** Dedupe case-insensitively; preserve first-seen order; cap length. */
export function sanitizeTagList(tags: string[]): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const t of tags) {
		const n = normalizeTagToken(t);
		if (!n) continue;
		const key = n.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(n);
		if (out.length >= MAX_NOTE_TAGS) break;
	}
	return out;
}

/** Union of existing + incoming; dedupe case-insensitively; existing order wins. */
export function mergeTagsUnionDedupe(existing: string[] | undefined, incoming: string[]): string[] {
	const base = sanitizeTagList(existing ?? []);
	const seen = new Set(base.map((t) => t.toLowerCase()));
	for (const t of sanitizeTagList(incoming)) {
		if (seen.has(t.toLowerCase())) continue;
		seen.add(t.toLowerCase());
		base.push(t);
		if (base.length >= MAX_NOTE_TAGS) break;
	}
	return base.slice(0, MAX_NOTE_TAGS);
}

export function sortKeyForTags(tags: string[] | undefined): string {
	const list = sanitizeTagList(tags ?? []);
	if (list.length === 0) return "";
	const sorted = [...list].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
	return sorted[0] ?? "";
}

/** Strip markdown fences and parse JSON array of tag strings. `null` = unrecoverable parse error. */
export function parseTagsFromModelOutput(raw: string): string[] | null {
	let s = raw.trim();
	const fence = /^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/m.exec(s);
	if (fence) s = fence[1].trim();
	const firstBracket = s.indexOf("[");
	const lastBracket = s.lastIndexOf("]");
	if (firstBracket !== -1 && lastBracket > firstBracket) {
		s = s.slice(firstBracket, lastBracket + 1);
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(s);
	} catch {
		return null;
	}
	if (!Array.isArray(parsed)) return null;
	const out: string[] = [];
	for (const item of parsed) {
		if (typeof item !== "string") continue;
		const n = normalizeTagToken(item);
		if (n) out.push(n);
	}
	return sanitizeTagList(out);
}
