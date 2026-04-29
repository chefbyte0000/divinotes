/**
 * Curated MLC prebuilt IDs aligned with WebLLM’s published model list.
 * @see https://github.com/mlc-ai/web-llm/blob/main/src/config.ts
 */
export type CuratedWebllmModel = {
	id: string;
	name: string;
	tagline: string;
	/** Rough download / VRAM hint for users */
	footprint: "light" | "medium" | "heavy";
};

export const CURATED_WEBLLM_MODELS: readonly CuratedWebllmModel[] = [
	{
		id: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
		name: "Llama 3.2 · 1B",
		tagline: "Fastest cold start, ideal for smoke tests and low-end GPUs.",
		footprint: "light",
	},
	{
		id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
		name: "Qwen 2.5 · 1.5B",
		tagline: "Alibaba Qwen instruct — compact and capable for everyday drafting.",
		footprint: "light",
	},
	{
		id: "Phi-3.5-mini-instruct-q4f16_1-MLC",
		name: "Phi-3.5 mini",
		tagline: "Microsoft Phi family; strong for size, modest download.",
		footprint: "medium",
	},
	{
		id: "gemma-2-2b-it-q4f16_1-MLC",
		name: "Gemma 2 · 2B",
		tagline: "Google Gemma 2 instruct — default “real” local assistant tier.",
		footprint: "medium",
	},
	{
		id: "Llama-3.2-3B-Instruct-q4f16_1-MLC",
		name: "Llama 3.2 · 3B",
		tagline: "Step up from 1B with still-reasonable weight size.",
		footprint: "medium",
	},
	{
		id: "gemma-2-9b-it-q4f16_1-MLC",
		name: "Gemma 2 · 9B",
		tagline: "Heavier Gemma; best quality here, longest download / compile.",
		footprint: "heavy",
	},
] as const;

export function footprintLabel(f: CuratedWebllmModel["footprint"]): string {
	switch (f) {
		case "light":
			return "Light";
		case "medium":
			return "Medium";
		case "heavy":
			return "Heavy";
	}
}
