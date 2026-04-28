/**
 * Worker-only: small sentence embedding model (384-dim) for Voy / RAG.
 * Lazily loads `@xenova/transformers` once and reuses the pipeline.
 */
const MAX_CHARS = 8000;

type PipeOut = { data: Float32Array };
type Extractor = (
	input: string,
	opts: { pooling: string; normalize: boolean },
) => Promise<PipeOut>;

let extractor: Extractor | null = null;

export async function embedTextForRag(text: string): Promise<Float32Array> {
	const { pipeline, env } = await import("@xenova/transformers");
	env.allowLocalModels = false;
	env.useBrowserCache = true;

	const trimmed = text.trim().slice(0, MAX_CHARS);
	if (!trimmed) {
		return new Float32Array(384);
	}

	if (!extractor) {
		extractor = (await pipeline(
			"feature-extraction",
			"Xenova/all-MiniLM-L6-v2",
		)) as Extractor;
	}

	const out = await extractor(trimmed, { pooling: "mean", normalize: true });
	return out.data;
}
