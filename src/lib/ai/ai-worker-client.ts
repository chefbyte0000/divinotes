/**
 * Main-thread helper: spawns `ai-worker.ts` and speaks `AiWorkerInbound` / `AiWorkerOutbound`.
 * Use only in the browser (`$app/environment` `browser`).
 */
import { browser } from "$app/environment";
import type { InitProgressReport } from "@mlc-ai/web-llm";
import {
	isAiWorkerOutbound,
	type AiWorkerOutbound,
	type GenerateCompletionPayload,
	type LoadModelPayload,
	type SearchContextSnippet,
	type SyncNoteEmbeddingPayload,
} from "./ai-protocol";

export type AiInferenceClient = {
	loadModel(
		payload: LoadModelPayload,
		options?: { onProgress?: (report: InitProgressReport) => void },
	): Promise<void>;
	generateCompletion(payload: GenerateCompletionPayload): AsyncGenerator<string, void, undefined>;
	/** Stops an in-flight streamed completion (ghost text / chat). */
	interrupt(): void;
	/** Upserts Voy embedding + metadata after a note is saved (same worker). */
	syncNoteEmbedding(payload: SyncNoteEmbeddingPayload): Promise<void>;
	/** Top‑K semantic snippets for `projectId` (General → `null`). */
	searchContext(query: string, projectId: string | null, topK?: number): Promise<SearchContextSnippet[]>;
	terminate(): void;
};

export function createAiInferenceClient(): AiInferenceClient {
	if (!browser) {
		throw new Error("createAiInferenceClient() is browser-only");
	}

	const worker = new Worker(new URL("./ai-worker.ts", import.meta.url), {
		type: "module",
	});

	const routes = new Map<string, (msg: AiWorkerOutbound) => void>();

	worker.onmessage = (ev: MessageEvent<unknown>) => {
		const msg = ev.data;
		if (!isAiWorkerOutbound(msg)) return;
		routes.get(msg.requestId)?.(msg);
	};

	function subscribe(requestId: string, handler: (msg: AiWorkerOutbound) => void): () => void {
		routes.set(requestId, handler);
		return () => {
			routes.delete(requestId);
		};
	}

	return {
		loadModel(payload, options) {
			const requestId = crypto.randomUUID();
			return new Promise<void>((resolve, reject) => {
				const off = subscribe(requestId, (msg) => {
					if (msg.type !== "LOAD_MODEL") return;
					if (msg.status === "progress") {
						options?.onProgress?.(msg.report);
						return;
					}
					if (msg.status === "complete") {
						off();
						resolve();
						return;
					}
					if (msg.status === "error") {
						off();
						reject(new Error(msg.message));
					}
				});
				worker.postMessage({
					type: "LOAD_MODEL",
					requestId,
					payload,
				});
			});
		},

		async *generateCompletion(payload: GenerateCompletionPayload) {
			const requestId = crypto.randomUUID();
			const pending: string[] = [];
			let finished = false;
			let error: Error | null = null;
			let wake: (() => void) | null = null;

			const off = subscribe(requestId, (msg) => {
				if (msg.type !== "GENERATE_COMPLETION") return;
				if (msg.status === "chunk") {
					pending.push(msg.text);
					wake?.();
					wake = null;
					return;
				}
				if (msg.status === "complete") {
					finished = true;
					wake?.();
					wake = null;
					return;
				}
				if (msg.status === "error") {
					error = new Error(msg.message);
					finished = true;
					wake?.();
					wake = null;
				}
			});

			try {
				worker.postMessage({
					type: "GENERATE_COMPLETION",
					requestId,
					payload,
				});

				while (!finished || pending.length > 0) {
					while (pending.length > 0) {
						yield pending.shift()!;
					}
					if (finished) break;
					await new Promise<void>((r) => {
						wake = r;
					});
				}

				if (error) throw error;
			} finally {
				off();
			}
		},

		interrupt() {
			const requestId = crypto.randomUUID();
			worker.postMessage({ type: "INTERRUPT", requestId });
		},

		syncNoteEmbedding(payload: SyncNoteEmbeddingPayload) {
			const requestId = crypto.randomUUID();
			return new Promise<void>((resolve, reject) => {
				const off = subscribe(requestId, (msg) => {
					if (msg.type !== "SYNC_NOTE_EMBEDDING") return;
					if (msg.status === "complete") {
						off();
						resolve();
						return;
					}
					if (msg.status === "error") {
						off();
						reject(new Error(msg.message));
					}
				});
				worker.postMessage({
					type: "SYNC_NOTE_EMBEDDING",
					requestId,
					payload,
				});
			});
		},

		searchContext(query: string, projectId: string | null, topK = 3) {
			const requestId = crypto.randomUUID();
			return new Promise<SearchContextSnippet[]>((resolve, reject) => {
				const off = subscribe(requestId, (msg) => {
					if (msg.type !== "SEARCH_CONTEXT") return;
					if (msg.status === "complete") {
						off();
						resolve(msg.results);
						return;
					}
					if (msg.status === "error") {
						off();
						reject(new Error(msg.message));
					}
				});
				worker.postMessage({
					type: "SEARCH_CONTEXT",
					requestId,
					payload: { query, projectId, topK },
				});
			});
		},

		terminate() {
			routes.clear();
			worker.terminate();
		},
	};
}
