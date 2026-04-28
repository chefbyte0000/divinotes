import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";

type WikiItem = { id: string; label: string };

/**
 * Vanilla DOM dropdown for TipTap wiki suggestions — keeps bundle small vs React/Vue renderers.
 */
export function createWikiSuggestionRenderer() {
	let root: HTMLDivElement | null = null;
	let itemsEl: HTMLUListElement | null = null;
	let active = 0;
	let latest: SuggestionProps<WikiItem> | null = null;

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
		root.style.maxWidth = `${Math.min(360, window.innerWidth - 16)}px`;
	}

	function highlight(items: HTMLLIElement[]) {
		items.forEach((el, i) => {
			el.classList.toggle("bg-accent", i === active);
			el.classList.toggle("text-accent-foreground", i === active);
		});
	}

	function paint(props: SuggestionProps<WikiItem>) {
		if (!itemsEl || !root) return;
		itemsEl.innerHTML = "";
		active = Math.min(active, Math.max(0, props.items.length - 1));

		if (props.items.length === 0) {
			const empty = document.createElement("li");
			empty.className = "text-muted-foreground px-2 py-1.5 text-sm";
			empty.textContent = "No matching notes";
			itemsEl.appendChild(empty);
			return;
		}

		props.items.forEach((item, index) => {
			const li = document.createElement("li");
			li.dataset.index = String(index);
			li.className =
				"hover:bg-accent hover:text-accent-foreground cursor-pointer rounded-sm px-2 py-1.5 text-sm";
			if (index === active) {
				li.classList.add("bg-accent", "text-accent-foreground");
			}
			li.textContent = item.label || "Untitled";
			li.addEventListener("mousedown", (e) => {
				e.preventDefault();
				props.command(item);
			});
			itemsEl!.appendChild(li);
		});
	}

	return {
		onStart: (props: SuggestionProps<WikiItem>) => {
			destroy();
			latest = props;
			root = document.createElement("div");
			root.className =
				"bg-popover text-popover-foreground border-border z-[100] max-h-60 min-w-[220px] overflow-auto rounded-md border p-1 shadow-md";
			itemsEl = document.createElement("ul");
			itemsEl.className = "m-0 list-none p-0";
			root.appendChild(itemsEl);
			document.body.appendChild(root);
			active = 0;
			paint(props);
			updatePosition(props.clientRect);
		},
		onUpdate: (props: SuggestionProps<WikiItem>) => {
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
				const wiki = latest?.items[active];
				if (wiki && latest) {
					latest.command(wiki);
					return true;
				}
			}
			return false;
		},
	};
}
