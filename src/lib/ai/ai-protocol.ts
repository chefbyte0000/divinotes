/**
 * Typed messages between the SvelteKit app (main thread) and `ai-worker.ts` (Web Worker).
 * Keeps UI and worker decoupled from WebLLM’s internal worker protocol.
 */

import type { ChatOptions, InitProgressReport } from "@mlc-ai/web-llm";

/** Default prebuilt model suitable for dev/smoke tests (~1B q4f16). */
export const DEFAULT_WEBLLM_MODEL_ID = "Llama-3.2-1B-Instruct-q4f16_1-MLC";

export type AiWorkerCommandType =
	| "LOAD_MODEL"
	| "GENERATE_COMPLETION"
	| "INTERRUPT"
	| "SYNC_NOTE_EMBEDDING"
	| "SEARCH_CONTEXT";

/** Main thread → worker */
export type AiWorkerInbound =
	| {
			type: "LOAD_MODEL";
			requestId: string;
			payload: LoadModelPayload;
	  }
	| {
			type: "GENERATE_COMPLETION";
			requestId: string;
			payload: GenerateCompletionPayload;
	  }
	| {
			type: "INTERRUPT";
			requestId: string;
	  }
	| {
			type: "SYNC_NOTE_EMBEDDING";
			requestId: string;
			payload: SyncNoteEmbeddingPayload;
	  }
	| {
			type: "SEARCH_CONTEXT";
			requestId: string;
			payload: SearchContextPayload;
	  };

export type LoadModelPayload = {
	modelId: string;
	chatOpts?: ChatOptions;
};

export type SyncNoteEmbeddingPayload = {
	noteId: string;
	/** `null` = General workspace — must match project silo rules. */
	projectId: string | null;
	text: string;
};

export type SearchContextPayload = {
	query: string;
	projectId: string | null;
	/** Defaults to 3 in the worker when omitted. */
	topK?: number;
};

export type SearchContextSnippet = {
	noteId: string;
	projectId: string | null;
	snippet: string;
};

export type GenerateCompletionPayload =
	| {
			mode: "chat";
			messages: Array<{
				role: "system" | "user" | "assistant" | "tool";
				content: string;
			}>;
			stream?: boolean;
			max_tokens?: number | null;
			temperature?: number | null;
			stop?: string | string[] | null;
	  }
	| {
			mode: "completion";
			prompt: string;
			stream?: boolean;
			max_tokens?: number | null;
			temperature?: number | null;
			stop?: string | string[] | null;
	  };

/** Worker → main thread */
export type AiWorkerOutbound =
	| {
			type: "LOAD_MODEL";
			requestId: string;
			status: "progress";
			report: InitProgressReport;
	  }
	| {
			type: "LOAD_MODEL";
			requestId: string;
			status: "complete";
	  }
	| {
			type: "LOAD_MODEL";
			requestId: string;
			status: "error";
			message: string;
	  }
	| {
			type: "GENERATE_COMPLETION";
			requestId: string;
			status: "chunk";
			text: string;
	  }
	| {
			type: "GENERATE_COMPLETION";
			requestId: string;
			status: "complete";
			finishReason?: string | null;
	  }
	| {
			type: "GENERATE_COMPLETION";
			requestId: string;
			status: "error";
			message: string;
	  }
	| {
			type: "INTERRUPT";
			requestId: string;
			status: "complete";
	  }
	| {
			type: "SYNC_NOTE_EMBEDDING";
			requestId: string;
			status: "complete";
	  }
	| {
			type: "SYNC_NOTE_EMBEDDING";
			requestId: string;
			status: "error";
			message: string;
	  }
	| {
			type: "SEARCH_CONTEXT";
			requestId: string;
			status: "complete";
			results: SearchContextSnippet[];
	  }
	| {
			type: "SEARCH_CONTEXT";
			requestId: string;
			status: "error";
			message: string;
	  };

const OUTBOUND_TYPES: ReadonlySet<string> = new Set([
	"LOAD_MODEL",
	"GENERATE_COMPLETION",
	"INTERRUPT",
	"SYNC_NOTE_EMBEDDING",
	"SEARCH_CONTEXT",
]);

export function isAiWorkerOutbound(msg: unknown): msg is AiWorkerOutbound {
	if (typeof msg !== "object" || msg === null) return false;
	const m = msg as Record<string, unknown>;
	return (
		typeof m.type === "string" &&
		OUTBOUND_TYPES.has(m.type) &&
		typeof m.requestId === "string"
	);
}
