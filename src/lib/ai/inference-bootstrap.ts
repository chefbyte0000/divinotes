/**
 * Lazy singleton + convenience loader — call `bootLocalInference()` from `onMount` (+layout or a gate)
 * so the worker receives `LOAD_MODEL` once WebGPU / onboarding checks pass.
 */
import { browser } from "$app/environment";
import type { InitProgressReport } from "@mlc-ai/web-llm";
import { DEFAULT_WEBLLM_MODEL_ID } from "./ai-protocol";
import { createAiInferenceClient, type AiInferenceClient } from "./ai-worker-client";

/** Synced with settings Local AI tab — preferred WebLLM prebuilt id. */
export const PREFERRED_WEBLLM_MODEL_STORAGE_KEY = "divinotes-preferred-webllm-model";

let instance: AiInferenceClient | null = null;
/** Last model id successfully passed to `loadModel` in this tab (best-effort). */
let loadedModelId: string | null = null;

export function getInferenceClient(): AiInferenceClient | null {
	if (!browser) return null;
	instance ??= createAiInferenceClient();
	return instance;
}

export function getPreferredWebllmModelId(): string {
	if (!browser) return DEFAULT_WEBLLM_MODEL_ID;
	try {
		const v = localStorage.getItem(PREFERRED_WEBLLM_MODEL_STORAGE_KEY)?.trim();
		return v || DEFAULT_WEBLLM_MODEL_ID;
	} catch {
		return DEFAULT_WEBLLM_MODEL_ID;
	}
}

export function getLoadedInferenceModelId(): string | null {
	return loadedModelId;
}

/**
 * Loads the user’s preferred model (or override) if it is not already loaded in this tab.
 * Avoids redundant `reload` calls when the same id was booted successfully.
 */
export async function ensureInferenceModelLoaded(options?: {
	modelId?: string;
	onProgress?: (report: InitProgressReport) => void;
	forceReload?: boolean;
}): Promise<void> {
	const client = getInferenceClient();
	if (!client) return;
	const id = options?.modelId ?? getPreferredWebllmModelId();
	if (!options?.forceReload && loadedModelId === id) return;
	await bootLocalInference({ modelId: id, onProgress: options?.onProgress });
}

export async function bootLocalInference(options?: {
	modelId?: string;
	onProgress?: (report: InitProgressReport) => void;
}): Promise<void> {
	const client = getInferenceClient();
	if (!client) return;
	const id = options?.modelId ?? DEFAULT_WEBLLM_MODEL_ID;
	await client.loadModel({ modelId: id }, { onProgress: options?.onProgress });
	loadedModelId = id;
}
