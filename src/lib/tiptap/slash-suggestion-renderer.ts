import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";

import type { SlashMenuItem } from "./slash-menu-items";

/**
 * Vanilla DOM dropdown for `/` slash commands — mirrors wiki suggestion UX.
 */
export function createSlashSuggestionRenderer() {
	let root: HTMLDivElement | null = null;
	let itemsEl: HTMLUListElement | null = null;
	let active = 0;
	let latest: SuggestionProps<SlashMenuItem> | null = null;

	function destroy() {
		root?.remove();
		root = null;
		itemsEl = null;
		active = 0;
		latest = null;
	}

	function updatePosition(clientRect: (() => DOMRect | null) | null | undefined) {
		if (!root || !clientRect) return;
		const rect = clientRect();
		if (!rect) return;
		root.style.position = "fixed";
		root.style.left = `${Math.max(8, rect.left)}px`;
		root.style.top = `${rect.bottom + 6}px`;
		root.style.maxWidth = `${Math.min(380, window.innerWidth - 16)}px`;
	}

	function highlight(items: HTMLLIElement[]) {
		items.forEach((el, i) => {
			el.classList.toggle("bg-accent", i === active);
			el.classList.toggle("text-accent-foreground", i === active);
		});
	}

	function paint(props: SuggestionProps<SlashMenuItem>) {
		if (!itemsEl || !root) return;
		itemsEl.innerHTML = "";
		active = Math.min(active, Math.max(0, props.items.length - 1));

		if (props.items.length === 0) {
			const empty = document.createElement("li");
			empty.className = "text-muted-foreground px-2 py-1.5 text-sm";
			empty.textContent = "No matching commands";
			itemsEl.appendChild(empty);
			return;
		}

		props.items.forEach((item, index) => {
			const li = document.createElement("li");
			li.dataset.index = String(index);
			li.className =
				"hover:bg-accent hover:text-accent-foreground flex cursor-pointer flex-col gap-0.5 rounded-sm px-2 py-1.5 text-left text-sm";
			if (index === active) {
				li.classList.add("bg-accent", "text-accent-foreground");
			}
			const top = document.createElement("div");
			top.className = "flex items-center justify-between gap-2";
			const lab = document.createElement("span");
			lab.className = "font-medium";
			lab.textContent = item.label;
			const grp = document.createElement("span");
			grp.className = "text-muted-foreground shrink-0 text-[10px] uppercase tracking-wide";
			grp.textContent = item.group;
			top.appendChild(lab);
			top.appendChild(grp);
			li.appendChild(top);
			if (item.description) {
				const desc = document.createElement("div");
				desc.className = "text-muted-foreground line-clamp-2 text-xs";
				desc.textContent = item.description;
				li.appendChild(desc);
			}
			li.addEventListener("mousedown", (e) => {
				e.preventDefault();
				props.command(item);
			});
			itemsEl!.appendChild(li);
		});
	}

	return {
		onStart: (props: SuggestionProps<SlashMenuItem>) => {
			destroy();
			latest = props;
			root = document.createElement("div");
			root.className =
				"bg-popover text-popover-foreground border-border z-[101] max-h-72 min-w-[260px] overflow-auto rounded-md border p-1 shadow-lg";
			itemsEl = document.createElement("ul");
			itemsEl.className = "m-0 list-none p-0";
			root.appendChild(itemsEl);
			document.body.appendChild(root);
			active = 0;
			paint(props);
			updatePosition(props.clientRect);
		},
		onUpdate: (props: SuggestionProps<SlashMenuItem>) => {
			latest = props;
			active = Math.min(active, Math.max(0, props.items.length - 1));
			paint(props);
			updatePosition(props.clientRect);
		},
		onExit: () => {
			destroy();
		},
		onKeyDown: (props: SuggestionKeyDownProps): boolean => {
			const items = latest?.items ?? [];
			const els = itemsEl
				? ([...itemsEl.querySelectorAll<HTMLLIElement>("[data-index]")] as HTMLLIElement[])
				: [];

			if (props.event.key === "ArrowDown") {
				active = Math.min(active + 1, Math.max(0, items.length - 1));
				highlight(els);
				return true;
			}
			if (props.event.key === "ArrowUp") {
				active = Math.max(active - 1, 0);
				highlight(els);
				return true;
			}
			if (props.event.key === "Enter") {
				const item = latest?.items[active];
				if (item && latest) {
					latest.command(item);
					return true;
				}
			}
			return false;
		},
	};
}
