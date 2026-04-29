/** Lets header fields (title / description) read the open note editor body before it is saved. */

let getter: (() => string) | null = null;

export function registerNotePlainTextGetter(fn: () => string): () => void {
	getter = fn;
	return () => {
		if (getter === fn) getter = null;
	};
}

export function currentNotePlainText(): string {
	return getter?.() ?? "";
}
