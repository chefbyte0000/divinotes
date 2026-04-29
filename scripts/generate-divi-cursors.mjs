/** Emit CSS custom properties for divinotes SVG cursors (run: node scripts/generate-divi-cursors.mjs) */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const enc = (svg) =>
	'url("data:image/svg+xml,' + encodeURIComponent(svg).replace(/'/g, "%27") + '")';

const L = { dot: "oklch(0.32 0.05 52)", ring: "oklch(0.42 0.072 52)", mut: "oklch(0.48 0.032 58)", dest: "oklch(0.52 0.19 25)" };
const D = { dot: "oklch(0.88 0.06 78)", ring: "oklch(0.82 0.07 78)", mut: "oklch(0.68 0.04 78)", dest: "oklch(0.62 0.17 22)" };

function svgLight(body, hx = 16, hy = 16, w = 32, h = 32) {
	const s = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
	const filled = s.replace(/LIGHT/g, L.dot).replace(/RING/g, L.ring).replace(/MUT/g, L.mut).replace(/DEST/g, L.dest);
	return { u: enc(filled), hx, hy };
}
function svgDark(body, hx = 16, hy = 16, w = 32, h = 32) {
	const s = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
	const filled = s
		.replace(/LIGHT/g, D.dot)
		.replace(/RING/g, D.ring)
		.replace(/MUT/g, D.mut)
		.replace(/DEST/g, D.dest);
	return { u: enc(filled), hx, hy };
}

function pair(body, fb, hx, hy) {
	const a = svgLight(body, hx, hy);
	const b = svgDark(body, hx, hy);
	return { light: `${a.u} ${a.hx} ${a.hy}, ${fb}`, dark: `${b.u} ${b.hx} ${b.hy}, ${fb}` };
}

const p = {
	default: pair(
		'<circle cx="16" cy="16" r="10" fill="none" stroke="RING" stroke-opacity="0.2" stroke-width="1"/><circle cx="16" cy="16" r="2.5" fill="LIGHT"/>',
		"default"
	),
	pointer: pair(
		'<circle cx="15" cy="15" r="11" fill="none" stroke="RING" stroke-opacity="0.22" stroke-width="1"/><circle cx="14" cy="14" r="2.75" fill="LIGHT"/><path d="M20 10l3 6-2.2.9L20 10z" fill="LIGHT" opacity="0.92"/>',
		"pointer",
		15,
		15
	),
	text: pair(
		'<path fill="LIGHT" d="M15 6h2v20h-2z"/><path fill="LIGHT" opacity="0.45" d="M12 8h8v1H12zm0 15h8v1H12z"/>',
		"text",
		16,
		20
	),
	notAllowed: pair(
		'<circle cx="16" cy="16" r="9" fill="none" stroke="DEST" stroke-width="1.5" opacity="0.85"/><path stroke="DEST" stroke-width="1.75" stroke-linecap="round" d="M10.5 21.5l11-11"/>',
		"not-allowed"
	),
	wait: pair(
		'<circle cx="16" cy="16" r="10" fill="none" stroke="RING" stroke-opacity="0.25"/><path stroke="LIGHT" stroke-width="1.5" stroke-linecap="round" d="M16 16V11M16 16l4 2"/>',
		"wait"
	),
	progress: pair(
		'<circle cx="16" cy="16" r="9" fill="none" stroke="MUT" stroke-width="1.5" stroke-dasharray="4 5" opacity="0.7"/><circle cx="16" cy="16" r="2.5" fill="LIGHT"/>',
		"progress"
	),
	move: pair(
		'<path fill="none" stroke="LIGHT" stroke-width="1.5" stroke-linecap="round" d="M16 7v18M7 16h18M16 7l-2.5 3h5L16 7m0 18l-2.5-3h5l-2.5 3M7 16l3-2.5v5L7 16m18 0l-3-2.5v5l3-2.5"/>',
		"move"
	),
	grab: pair(
		'<path fill="none" stroke="LIGHT" stroke-width="1.75" stroke-linecap="round" d="M11 14c0-2 1.2-3.2 3-3.2.8 0 1.5.3 2 .8.5-.5 1.2-.8 2-.8 1.8 0 3 1.2 3 3.2V19a3 3 0 01-3 3h-4a3 3 0 01-3-3v-5z"/><circle cx="16" cy="22" r="1.2" fill="RING" opacity="0.35"/>',
		"grab",
		16,
		18
	),
	grabbing: pair(
		'<path fill="LIGHT" opacity="0.9" d="M12 15c0-1.5.9-2.5 2.2-2.5.5 0 1 .2 1.3.5l.5.4.5-.4c.3-.3.8-.5 1.3-.5 1.3 0 2.2 1 2.2 2.5v3.5c0 1.4-1.1 2.5-2.5 2.5h-3c-1.4 0-2.5-1.1-2.5-2.5V15z"/>',
		"grabbing",
		16,
		18
	),
	colResize: pair(
		'<path fill="none" stroke="LIGHT" stroke-width="1.5" stroke-linecap="round" d="M16 8v16M12 12l4-4 4 4M12 20l4 4 4-4"/>',
		"col-resize"
	),
	rowResize: pair(
		'<path fill="none" stroke="LIGHT" stroke-width="1.5" stroke-linecap="round" d="M8 16h16M12 12l-4 4 4 4M20 12l4 4-4 4"/>',
		"row-resize"
	),
	ewResize: pair(
		'<path fill="none" stroke="LIGHT" stroke-width="1.5" stroke-linecap="round" d="M9 16H6l3-3m0 6l-3-3h3m14 0h3l-3-3m0 6l3-3h-3"/>',
		"ew-resize"
	),
	nsResize: pair(
		'<path fill="none" stroke="LIGHT" stroke-width="1.5" stroke-linecap="round" d="M16 9V6l-3 3m6 0l-3-3v3m0 14v3l-3-3m6 0l-3 3v-3"/>',
		"ns-resize"
	),
	nwseResize: pair(
		'<path fill="none" stroke="LIGHT" stroke-width="1.5" stroke-linecap="round" d="M11 11l-3-3M11 11l3-3M21 11l3-3M21 11l-3-3M11 21l-3 3M11 21l3 3M21 21l3 3M21 21l-3 3"/>',
		"nwse-resize"
	),
	neswResize: pair(
		'<path fill="none" stroke="LIGHT" stroke-width="1.5" stroke-linecap="round" d="M21 11l3-3M21 11l-3-3M11 11l-3-3M11 11l3-3M21 21l3 3M21 21l-3 3M11 21l-3 3M11 21l3 3"/>',
		"nesw-resize"
	),
	nResize: pair(
		'<path fill="none" stroke="LIGHT" stroke-width="1.5" stroke-linecap="round" d="M16 22V10m0 0l-3 3m3-3l3 3"/>',
		"n-resize",
		16,
		22
	),
	sResize: pair(
		'<path fill="none" stroke="LIGHT" stroke-width="1.5" stroke-linecap="round" d="M16 10v12m0 0l-3-3m3 3l3-3"/>',
		"s-resize",
		16,
		10
	),
	eResize: pair(
		'<path fill="none" stroke="LIGHT" stroke-width="1.5" stroke-linecap="round" d="M10 16h12m0 0l-3-3m3 3l-3 3"/>',
		"e-resize",
		10,
		16
	),
	wResize: pair(
		'<path fill="none" stroke="LIGHT" stroke-width="1.5" stroke-linecap="round" d="M22 16H10m0 0l3-3m-3 3l3 3"/>',
		"w-resize",
		22,
		16
	),
	neResize: pair(
		'<path fill="none" stroke="LIGHT" stroke-width="1.5" stroke-linecap="round" d="M11 21V11h10M11 21l3-3M11 21l-3-3"/>',
		"ne-resize",
		11,
		21
	),
	nwResize: pair(
		'<path fill="none" stroke="LIGHT" stroke-width="1.5" stroke-linecap="round" d="M21 21V11H11M21 21l-3-3M21 21l3-3"/>',
		"nw-resize",
		21,
		21
	),
	seResize: pair(
		'<path fill="none" stroke="LIGHT" stroke-width="1.5" stroke-linecap="round" d="M11 11v10h10M11 11l3 3M11 11l-3 3"/>',
		"se-resize",
		11,
		11
	),
	swResize: pair(
		'<path fill="none" stroke="LIGHT" stroke-width="1.5" stroke-linecap="round" d="M21 11v10H11M21 11l-3 3M21 11l3 3"/>',
		"sw-resize",
		21,
		11
	),
	help: pair(
		'<circle cx="16" cy="14" r="6" fill="none" stroke="RING" stroke-width="1.25" opacity="0.55"/><path fill="LIGHT" d="M14 19h4v2h-4zm1-3.5c0-1.5 1-2 2-2.2 1-.3 2-.8 2-2.1 0-2-1.8-2.2-3-1.2-1.1-1-2.5-.2-3.4 1.1-1.2 3.4-1.2 4.6 0 1.1 1 1.1 2.4.2 3.4-.6.6-1.4.9-2 1.5-.4.4-.6 1-.6 1.7H15c0-1.2.4-2 .9-2.6z"/>',
		"help"
	),
	crosshair: pair(
		'<path stroke="LIGHT" stroke-width="1.25" d="M16 8v16M8 16h16" opacity="0.85"/>',
		"crosshair"
	),
	zoomIn: pair(
		'<circle cx="14" cy="14" r="6.5" fill="none" stroke="LIGHT" stroke-width="1.35"/><path stroke="LIGHT" stroke-width="1.35" stroke-linecap="round" d="M14 11v6M11 14h6M19 19l5 5"/><circle cx="21" cy="21" r="1" fill="LIGHT" opacity="0.4"/>',
		"zoom-in",
		14,
		14
	),
	zoomOut: pair(
		'<circle cx="14" cy="14" r="6.5" fill="none" stroke="LIGHT" stroke-width="1.35"/><path stroke="LIGHT" stroke-width="1.35" stroke-linecap="round" d="M11 14h6M19 19l5 5"/>',
		"zoom-out",
		14,
		14
	),
	copy: pair(
		'<rect x="10" y="10" width="10" height="10" rx="1.5" fill="none" stroke="LIGHT" stroke-width="1.25"/><rect x="12" y="8" width="10" height="10" rx="1.5" fill="none" stroke="RING" stroke-opacity="0.45" stroke-width="1.25"/>',
		"copy",
		15,
		14
	),
	alias: pair(
		'<path fill="none" stroke="LIGHT" stroke-width="1.5" stroke-linecap="round" d="M11 21c4-6 4-10 9-11M11 21l3-1m-3 1l-1-3"/>',
		"alias",
		11,
		21
	),
	cell: pair(
		'<path fill="none" stroke="LIGHT" stroke-width="1.2" d="M10 10h12v12H10zM16 10v12M10 16h12" opacity="0.9"/>',
		"cell"
	),
	allScroll: pair(
		'<circle cx="16" cy="16" r="2.5" fill="LIGHT"/><path fill="none" stroke="RING" stroke-opacity="0.35" stroke-width="1.2" d="M16 9V6l-2 2m2-2l2 2m0 16l-2-2m2 2v3l2-2m-2 2l-2-2M9 16H6l2-2m-2 2l2 2m16 0l-2-2m2 2h3l-2-2m2 2l-2 2"/>',
		"all-scroll"
	),
	verticalText: pair(
		'<path fill="LIGHT" d="M18 8h2v16h-2z" opacity="0.85"/><path fill="LIGHT" opacity="0.35" d="M14 10h10v1H14zm0 11h10v1H14z"/>',
		"vertical-text",
		19,
		16
	),
	contextMenu: pair(
		'<rect x="11" y="9" width="10" height="10" rx="1" fill="none" stroke="RING" stroke-opacity="0.4"/><path fill="LIGHT" d="M13 12h6v1h-6zm0 3h6v1h-6z"/>',
		"context-menu",
		14,
		14
	),
	/** Same glyph as not-allowed (Tailwind no-drop) */
	noDrop: pair(
		'<circle cx="16" cy="16" r="9" fill="none" stroke="DEST" stroke-width="1.5" opacity="0.85"/><path stroke="DEST" stroke-width="1.75" stroke-linecap="round" d="M10.5 21.5l11-11"/>',
		"no-drop"
	),
	none: "none",
};

/** camelCase → kebab for CSS custom property suffix */
function toVarKey(k) {
	return k.replace(/([A-Z])/g, "-$1").toLowerCase().replace(/^-/, "");
}

let out = `/* Generated by scripts/generate-divi-cursors.mjs — do not edit by hand */\n`;
out += `@media (pointer: fine) and (hover: hover) {\n`;
out += `\t:root {\n`;
for (const [k, v] of Object.entries(p)) {
	if (k === "none") {
		out += `\t\t--divi-cursor-none: none;\n`;
		continue;
	}
	out += `\t\t--divi-cursor-${toVarKey(k)}: ${v.light};\n`;
}
out += `\t}\n\n\thtml.dark {\n`;
for (const [k, v] of Object.entries(p)) {
	if (k === "none") {
		out += `\t\t--divi-cursor-none: none;\n`;
		continue;
	}
	out += `\t\t--divi-cursor-${toVarKey(k)}: ${v.dark};\n`;
}
out += `\t}\n`;

const rules = [];

rules.push(`\thtml { cursor: var(--divi-cursor-default); }`);

/** :where() keeps specificity 0 so Tailwind cursor-* utilities always win */
const pointerish = [
	"a[href]:not([aria-disabled='true'])",
	"button:not(:disabled)",
	'[role="button"]:not([aria-disabled="true"])',
	'[role="link"][href]:not([aria-disabled="true"])',
	'[role="menuitem"]:not([aria-disabled="true"])',
	'[role="option"]:not([aria-disabled="true"])',
	'[role="tab"]:not([aria-disabled="true"])',
	'[role="switch"]:not([aria-disabled="true"])',
	"summary",
	'label[for]',
	'input[type="button"]:not(:disabled)',
	'input[type="submit"]:not(:disabled)',
	'input[type="reset"]:not(:disabled)',
	'input[type="file"]:not(:disabled)',
	"select:not(:disabled)",
];

rules.push(
	`\t:where(${pointerish.join(",\n\t\t")}) { cursor: var(--divi-cursor-pointer); }`
);

rules.push(
	`\t:where(input[type="checkbox"]:not(:disabled), input[type="radio"]:not(:disabled)) { cursor: var(--divi-cursor-pointer); }`
);

const textish = [
	'input[type="text"]',
	'input[type="search"]',
	'input[type="email"]',
	'input[type="password"]',
	'input[type="url"]',
	'input[type="tel"]',
	'input[type="number"]',
	"textarea",
	'[contenteditable="true"]',
	'[contenteditable="plaintext-only"]',
];

rules.push(`\t:where(${textish.join(",\n\t\t")}) { cursor: var(--divi-cursor-text); }`);

rules.push(
	`\t:where(button:disabled, input:disabled, textarea:disabled, select:disabled, option:disabled, [aria-disabled="true"], [data-disabled]) { cursor: var(--divi-cursor-not-allowed); }`
);

// Tailwind cursor utilities (override bundled utilities)
const tw = [
	[".cursor-auto", "default"],
	[".cursor-default", "default"],
	[".cursor-pointer", "pointer"],
	[".cursor-text", "text"],
	[".cursor-move", "move"],
	[".cursor-not-allowed", "not-allowed"],
	[".cursor-wait", "wait"],
	[".cursor-progress", "progress"],
	[".cursor-help", "help"],
	[".cursor-crosshair", "crosshair"],
	[".cursor-grab", "grab"],
	[".cursor-grabbing", "grabbing"],
	[".cursor-col-resize", "col-resize"],
	[".cursor-row-resize", "row-resize"],
	[".cursor-n-resize", "n-resize"],
	[".cursor-e-resize", "e-resize"],
	[".cursor-s-resize", "s-resize"],
	[".cursor-w-resize", "w-resize"],
	[".cursor-ne-resize", "ne-resize"],
	[".cursor-nw-resize", "nw-resize"],
	[".cursor-se-resize", "se-resize"],
	[".cursor-sw-resize", "sw-resize"],
	[".cursor-ew-resize", "ew-resize"],
	[".cursor-ns-resize", "ns-resize"],
	[".cursor-nesw-resize", "nesw-resize"],
	[".cursor-nwse-resize", "nwse-resize"],
	[".cursor-zoom-in", "zoom-in"],
	[".cursor-zoom-out", "zoom-out"],
	[".cursor-copy", "copy"],
	[".cursor-alias", "alias"],
	[".cursor-cell", "cell"],
	[".cursor-all-scroll", "all-scroll"],
	[".cursor-vertical-text", "vertical-text"],
	[".cursor-context-menu", "context-menu"],
	[".cursor-no-drop", "no-drop"],
	[".cursor-none", "none"],
];

for (const [sel, key] of tw) {
	if (key === "none") {
		rules.push(`\t${sel} { cursor: var(--divi-cursor-none); }`);
	} else {
		rules.push(`\t${sel} { cursor: var(--divi-cursor-${key}); }`);
	}
}

out += "\n" + rules.join("\n") + "\n}\n";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dest = path.join(__dirname, "../src/routes/divinotes-cursors.generated.css");
fs.writeFileSync(dest, out);
console.log("Wrote", dest);
