/**
 * Lazy singleton + convenience loader — call `bootLocalInference()` from `onMount` (+layout or a gate)
 * so the worker receives `LOAD_MODEL` once WebGPU / onboarding checks pass.
 */
import { browser } from "$app/environment";
import type { InitProgressReport } from "@mlc-ai/web-llm";
import { DEFAULT_WEBLLM_MODEL_ID } from "./ai-protocol";
import { createAiInferenceClient, type AiInferenceClient } from "./ai-worker-client";

let instance: AiInferenceClient | null = null;

export function getInferenceClient(): AiInferenceClient | null {
	if (!browser) return null;
	instance ??= createAiInferenceClient();
	return instance;
}

export async function bootLocalInference(options?: {
	modelId?: string;
	onProgress?: (report: InitProgressReport) => void;
}): Promise<void> {
	const client = getInferenceClient();
	if (!client) return;
	await client.loadModel(
		{ modelId: options?.modelId ?? DEFAULT_WEBLLM_MODEL_ID },
		{ onProgress: options?.onProgress },
	);
}
