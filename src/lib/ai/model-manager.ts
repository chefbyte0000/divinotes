/**
 * Stores large model weights with the Cache Storage API (better suited to multi‑GB blobs than IndexedDB).
 * Intended for same-origin URLs or CORS-enabled CDN responses.
 */

import { getStorageEstimate } from "./persistent-storage";

export const DEFAULT_MODEL_CACHE_NAME = "divinotes-models-v1";

export type ModelArtifactDownloadEvent = {
	url: string;
	loadedBytes: number;
	totalBytes: number | null;
	overallLoadedBytes: number;
	overallTotalBytes: number | null;
};

export type ModelManagerOptions = {
	cacheName?: string;
};

export class ModelManager {
	private readonly cacheName: string;

	constructor(options?: ModelManagerOptions) {
		this.cacheName = options?.cacheName ?? DEFAULT_MODEL_CACHE_NAME;
	}

	async open(): Promise<Cache> {
		return caches.open(this.cacheName);
	}

	async has(url: string): Promise<boolean> {
		const cache = await this.open();
		const hit = await cache.match(url);
		return hit !== undefined;
	}

	/** Cached Response for loaders (e.g. WebLLM custom fetch). */
	async getResponse(url: string): Promise<Response | undefined> {
		const cache = await this.open();
		return cache.match(url);
	}

	async delete(url: string): Promise<boolean> {
		const cache = await this.open();
		return cache.delete(url);
	}

	async deleteAll(): Promise<boolean> {
		return caches.delete(this.cacheName);
	}

	/**
	 * Streams `fetch(url)` into cache without buffering the full body in JS heap.
	 * Reports progress from the transformed stream passed to `cache.put`.
	 */
	async ensureCached(
		url: string,
		options?: {
			signal?: AbortSignal;
			onProgress?: (event: ModelArtifactDownloadEvent) => void;
			/** Bytes already fully cached before this URL (multi-artifact batches). */
			priorLoadedBytes?: number;
			/** Total bytes for the full artifact set when known (e.g. sum of Content-Length). */
			overallBudgetBytes?: number | null;
		},
	): Promise<void> {
		const cache = await this.open();
		const existing = await cache.match(url);
		if (existing) {
			const lengthHeader = existing.headers.get("Content-Length");
			const totalBytes = lengthHeader ? parseInt(lengthHeader, 10) : null;
			options?.onProgress?.({
				url,
				loadedBytes: totalBytes ?? 0,
				totalBytes,
				overallLoadedBytes: (options.priorLoadedBytes ?? 0) + (totalBytes ?? 0),
				overallTotalBytes: options?.overallBudgetBytes ?? null,
			});
			return;
		}

		const request = new Request(url);
		const response = await fetch(request, { signal: options?.signal });
		if (!response.ok) {
			throw new Error(`Failed to fetch model artifact (${response.status}): ${url}`);
		}
		if (!response.body) {
			throw new Error(`No response body for ${url}`);
		}

		const totalBytes = readContentLength(response.headers);
		let loadedBytes = 0;
		const priorLoaded = options?.priorLoadedBytes ?? 0;

		const emit = () => {
			options?.onProgress?.({
				url,
				loadedBytes,
				totalBytes,
				overallLoadedBytes: priorLoaded + loadedBytes,
				overallTotalBytes: options?.overallBudgetBytes ?? null,
			});
		};

		const stream = response.body.pipeThrough(
			new TransformStream<Uint8Array, Uint8Array>({
				transform(chunk, controller) {
					loadedBytes += chunk.byteLength;
					emit();
					controller.enqueue(chunk);
				},
			}),
		);

		const toStore = new Response(stream, {
			status: response.status,
			statusText: response.statusText,
			headers: stripHopByHopHeaders(response.headers),
		});

		try {
			await cache.put(url, toStore);
		} catch (err) {
			await cache.delete(url).catch(() => {});
			throw err;
		}

		emit();
	}

	/**
	 * Ensures every URL is present in cache, sequentially (friendlier to bandwidth / disk).
	 * Best-effort HEAD prefetch fills `overallBudgetBytes` when every URL reports Content-Length.
	 */
	async ensureAllCached(
		urls: readonly string[],
		options?: {
			signal?: AbortSignal;
			onProgress?: (event: ModelArtifactDownloadEvent) => void;
		},
	): Promise<void> {
		let completedBytes = 0;

		const headLengths = await Promise.all(
			urls.map(async (u) => {
				try {
					const head = await fetch(u, { method: "HEAD", signal: options?.signal });
					if (!head.ok) return null;
					return readContentLength(head.headers);
				} catch {
					return null;
				}
			}),
		);

		const overallBudgetBytes = headLengths.every((v) => v != null)
			? headLengths.reduce((a, b) => a + (b ?? 0), 0)
			: null;

		for (const url of urls) {
			if (options?.signal?.aborted) {
				throw new DOMException("Aborted", "AbortError");
			}

			await this.ensureCached(url, {
				signal: options?.signal,
				priorLoadedBytes: completedBytes,
				overallBudgetBytes,
				onProgress: options?.onProgress,
			});

			const cache = await this.open();
			const stored = await cache.match(url);
			const len = stored?.headers.get("Content-Length");
			if (len) {
				completedBytes += parseInt(len, 10);
			}
		}
	}
}

function readContentLength(headers: Headers): number | null {
	const raw = headers.get("Content-Length");
	if (!raw) return null;
	const n = parseInt(raw, 10);
	return Number.isFinite(n) ? n : null;
}

/** Avoid caching headers that may confuse cache.match / replay semantics. */
function stripHopByHopHeaders(headers: Headers): Headers {
	const out = new Headers(headers);
	out.delete("Keep-Alive");
	out.delete("Proxy-Authenticate");
	out.delete("Proxy-Authorization");
	out.delete("TE");
	out.delete("Trailers");
	out.delete("Transfer-Encoding");
	out.delete("Upgrade");
	return out;
}

/**
 * Best-effort hint: logs whether quota looks sufficient vs estimated multi‑GB footprint.
 */
export async function warnIfQuotaLikelyTooLow(
	minBytes: number,
	label = "model cache",
): Promise<void> {
	if (typeof console === "undefined" || typeof console.warn !== "function") return;
	const est = await getStorageEstimate();
	if (!est) return;
	if (est.quotaBytes < minBytes) {
		console.warn(
			`[divinotes] ${label}: quota (~${formatBytes(est.quotaBytes)}) may be below recommended (~${formatBytes(minBytes)}).`,
		);
	}
}

function formatBytes(n: number): string {
	if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1)} GiB`;
	if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MiB`;
	return `${Math.round(n / 1024)} KiB`;
}
