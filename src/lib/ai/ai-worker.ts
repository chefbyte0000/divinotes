/// <reference lib="webworker" />

/**
 * Web Worker entry: hosts `MLCEngine` and speaks the Divinotes `AiWorkerInbound` protocol.
 */
import { MLCEngine } from "@mlc-ai/web-llm";
import type {
	ChatCompletionChunk,
	ChatCompletionMessageParam,
	Completion,
} from "@mlc-ai/web-llm";
import type {
	AiWorkerInbound,
	AiWorkerOutbound,
	GenerateCompletionPayload,
} from "./ai-protocol";
import { RagVectorStore } from "./rag-vector-store";

declare const self: DedicatedWorkerGlobalScope;

const engine = new MLCEngine();

let ragStorePromise: Promise<RagVectorStore> | null = null;

function ensureRagStore(): Promise<RagVectorStore> {
	ragStorePromise ??= RagVectorStore.create();
	return ragStorePromise;
}

function post(msg: AiWorkerOutbound): void {
	self.postMessage(msg);
}

function chatChunkDelta(chunk: ChatCompletionChunk): string {
	const c = chunk.choices[0]?.delta?.content;
	return typeof c === "string" ? c : "";
}

function completionChunkDelta(chunk: Completion): string {
	const t = chunk.choices[0]?.text;
	return typeof t === "string" ? t : "";
}

async function handleLoadModel(msg: Extract<AiWorkerInbound, { type: "LOAD_MODEL" }>): Promise<void> {
	const { requestId, payload } = msg;
	try {
		engine.setInitProgressCallback((report) => {
			post({ type: "LOAD_MODEL", requestId, status: "progress", report });
		});
		await engine.reload(payload.modelId, payload.chatOpts);
		post({ type: "LOAD_MODEL", requestId, status: "complete" });
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		post({ type: "LOAD_MODEL", requestId, status: "error", message });
	}
}

async function handleGenerateCompletion(
	msg: Extract<AiWorkerInbound, { type: "GENERATE_COMPLETION" }>,
): Promise<void> {
	const { requestId, payload } = msg;
	try {
		if (payload.mode === "chat") {
			await streamChat(requestId, payload);
		} else {
			await streamCompletion(requestId, payload);
		}
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		post({
			type: "GENERATE_COMPLETION",
			requestId,
			status: "error",
			message,
		});
	}
}

async function streamChat(
	requestId: string,
	payload: Extract<GenerateCompletionPayload, { mode: "chat" }>,
): Promise<void> {
	const stream = payload.stream !== false;
	if (stream) {
		const iterable = await engine.chatCompletion({
			messages: payload.messages as ChatCompletionMessageParam[],
			stream: true,
			max_tokens: payload.max_tokens ?? undefined,
			temperature: payload.temperature ?? undefined,
			stop: payload.stop ?? undefined,
		});
		for await (const chunk of iterable) {
			const text = chatChunkDelta(chunk);
			if (text) {
				post({ type: "GENERATE_COMPLETION", requestId, status: "chunk", text });
			}
			const reason = chunk.choices[0]?.finish_reason;
			if (reason === "abort") break;
		}
		post({
			type: "GENERATE_COMPLETION",
			requestId,
			status: "complete",
			finishReason: null,
		});
	} else {
		const result = await engine.chatCompletion({
			messages: payload.messages as ChatCompletionMessageParam[],
			stream: false,
			max_tokens: payload.max_tokens ?? undefined,
			temperature: payload.temperature ?? undefined,
			stop: payload.stop ?? undefined,
		});
		const text = result.choices[0]?.message?.content;
		const out = typeof text === "string" ? text : "";
		if (out) {
			post({ type: "GENERATE_COMPLETION", requestId, status: "chunk", text: out });
		}
		post({
			type: "GENERATE_COMPLETION",
			requestId,
			status: "complete",
			finishReason: result.choices[0]?.finish_reason ?? null,
		});
	}
}

async function streamCompletion(
	requestId: string,
	payload: Extract<GenerateCompletionPayload, { mode: "completion" }>,
): Promise<void> {
	const stream = payload.stream !== false;
	if (stream) {
		const iterable = await engine.completion({
			prompt: payload.prompt,
			stream: true,
			max_tokens: payload.max_tokens ?? undefined,
			temperature: payload.temperature ?? undefined,
			stop: payload.stop ?? undefined,
		});
		for await (const chunk of iterable) {
			const text = completionChunkDelta(chunk);
			if (text) {
				post({ type: "GENERATE_COMPLETION", requestId, status: "chunk", text });
			}
			const reason = chunk.choices[0]?.finish_reason;
			if (reason === "abort") break;
		}
		post({
			type: "GENERATE_COMPLETION",
			requestId,
			status: "complete",
			finishReason: null,
		});
	} else {
		const result = await engine.completion({
			prompt: payload.prompt,
			stream: false,
			max_tokens: payload.max_tokens ?? undefined,
			temperature: payload.temperature ?? undefined,
			stop: payload.stop ?? undefined,
		});
		const text = result.choices[0]?.text ?? "";
		if (text) {
			post({ type: "GENERATE_COMPLETION", requestId, status: "chunk", text });
		}
		post({
			type: "GENERATE_COMPLETION",
			requestId,
			status: "complete",
			finishReason: result.choices[0]?.finish_reason ?? null,
		});
	}
}

function handleInterrupt(msg: Extract<AiWorkerInbound, { type: "INTERRUPT" }>): void {
	engine.interruptGenerate();
	post({ type: "INTERRUPT", requestId: msg.requestId, status: "complete" });
}

async function handleSyncNoteEmbedding(
	msg: Extract<AiWorkerInbound, { type: "SYNC_NOTE_EMBEDDING" }>,
): Promise<void> {
	const { requestId, payload } = msg;
	try {
		const store = await ensureRagStore();
		await store.upsert(payload.noteId, payload.projectId, payload.text);
		post({ type: "SYNC_NOTE_EMBEDDING", requestId, status: "complete" });
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		post({ type: "SYNC_NOTE_EMBEDDING", requestId, status: "error", message });
	}
}

async function handleSearchContext(
	msg: Extract<AiWorkerInbound, { type: "SEARCH_CONTEXT" }>,
): Promise<void> {
	const { requestId, payload } = msg;
	try {
		const store = await ensureRagStore();
		const topK = payload.topK ?? 3;
		const results = await store.searchContext(payload.query, payload.projectId, topK);
		post({ type: "SEARCH_CONTEXT", requestId, status: "complete", results });
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		post({ type: "SEARCH_CONTEXT", requestId, status: "error", message });
	}
}

self.onmessage = (ev: MessageEvent<AiWorkerInbound>) => {
	const data = ev.data;
	switch (data.type) {
		case "LOAD_MODEL":
			void handleLoadModel(data);
			break;
		case "GENERATE_COMPLETION":
			void handleGenerateCompletion(data);
			break;
		case "INTERRUPT":
			handleInterrupt(data);
			break;
		case "SYNC_NOTE_EMBEDDING":
			void handleSyncNoteEmbedding(data);
			break;
		case "SEARCH_CONTEXT":
			void handleSearchContext(data);
			break;
		default:
			break;
	}
};
