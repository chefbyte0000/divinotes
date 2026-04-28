/**
 * Client-side WebGPU capability checks for local inference (e.g. Gemma via WebLLM).
 * Call only in the browser; `navigator.gpu` is unavailable during SSR.
 */

/** WebGPU spec baseline for large storage bindings (128 MiB). */
const MIN_MAX_STORAGE_BUFFER_BINDING_SIZE = 128 * 1024 * 1024;

/** Typical minimum for multi-hundred-MB weights split across buffers (256 MiB). */
const MIN_MAX_BUFFER_SIZE = 256 * 1024 * 1024;

export type WebGpuTier = "high-performance" | "default" | "low-power";

export type WebGpuDetectionOk = {
	ok: true;
	adapter: GPUAdapter;
	limits: GPUSupportedLimits;
	/** Which request succeeded first in our probe order. */
	tier: WebGpuTier;
	/**
	 * High-performance failed but another adapter worked — likely integrated graphics.
	 * Local AI may be slower; still usable if limits pass.
	 */
	integratedLikely: boolean;
};

export type WebGpuDetectionFail = {
	ok: false;
	/** Machine-readable reason */
	code: "no-api" | "no-adapter" | "limits-insufficient";
	/** Short title for UI */
	title: string;
	/** Longer explanation for users */
	description: string;
	limits?: GPUSupportedLimits;
};

export type WebGpuDetectionResult = WebGpuDetectionOk | WebGpuDetectionFail;

function verifyAdapterLimits(limits: GPUSupportedLimits): { ok: boolean; reasons: string[] } {
	const reasons: string[] = [];
	if (limits.maxStorageBufferBindingSize < MIN_MAX_STORAGE_BUFFER_BINDING_SIZE) {
		reasons.push(
			`maxStorageBufferBindingSize (${limits.maxStorageBufferBindingSize}) below minimum (${MIN_MAX_STORAGE_BUFFER_BINDING_SIZE})`,
		);
	}
	if (limits.maxBufferSize < MIN_MAX_BUFFER_SIZE) {
		reasons.push(`maxBufferSize (${limits.maxBufferSize}) below minimum (${MIN_MAX_BUFFER_SIZE})`);
	}
	return { ok: reasons.length === 0, reasons };
}

function fail(
	code: WebGpuDetectionFail["code"],
	title: string,
	description: string,
	limits?: GPUSupportedLimits,
): WebGpuDetectionFail {
	return { ok: false, code, title, description, limits };
}

/**
 * Returns whether the WebGPU API object exists (browser supported flag).
 */
export function isWebGpuApiAvailable(): boolean {
	return typeof navigator !== "undefined" && !!navigator.gpu;
}

/**
 * Request an adapter in a fixed order and return the first that passes limit checks.
 */
export async function detectWebGpu(): Promise<WebGpuDetectionResult> {
	if (!isWebGpuApiAvailable()) {
		return fail(
			"no-api",
			"Browser not supported",
			"This browser does not expose WebGPU. Use a recent Chromium-based browser (Chrome, Edge, Arc) or Safari Technology Preview with WebGPU enabled for on-device AI.",
		);
	}

	const gpu = navigator.gpu;

	const tryAdapter = async (
		options?: GPURequestAdapterOptions,
	): Promise<GPUAdapter | null> => {
		try {
			return await gpu.requestAdapter(options);
		} catch {
			return null;
		}
	};

	const candidates: { adapter: GPUAdapter; tier: WebGpuTier }[] = [];

	const hp = await tryAdapter({ powerPreference: "high-performance" });
	if (hp) candidates.push({ adapter: hp, tier: "high-performance" });

	const def = await tryAdapter();
	if (def) candidates.push({ adapter: def, tier: "default" });

	const lp = await tryAdapter({ powerPreference: "low-power" });
	if (lp) candidates.push({ adapter: lp, tier: "low-power" });

	const seen = new Set<GPUAdapter>();
	const ordered = candidates.filter((c) => {
		if (seen.has(c.adapter)) return false;
		seen.add(c.adapter);
		return true;
	});

	for (const { adapter, tier } of ordered) {
		const check = verifyAdapterLimits(adapter.limits);
		if (check.ok) {
			return {
				ok: true,
				adapter,
				limits: adapter.limits,
				tier,
				integratedLikely: tier !== "high-performance",
			};
		}
		if (ordered.length === 1) {
			return fail(
				"limits-insufficient",
				"GPU limits too low",
				`Your GPU reports limits below what local models need (${check.reasons.join("; ")}).`,
				adapter.limits,
			);
		}
	}

	const last = ordered[ordered.length - 1];
	if (last) {
		const check = verifyAdapterLimits(last.adapter.limits);
		return fail(
			"limits-insufficient",
			"GPU limits too low",
			`Your GPU reports limits below what local models need (${check.reasons.join("; ")}).`,
			last.adapter.limits,
		);
	}

	return fail(
		"no-adapter",
		"No dedicated GPU detected",
		"No WebGPU adapter responded. Update GPU drivers, try a Chromium-based browser with WebGPU enabled, or choose Cloud-only mode when it ships.",
	);
}

/** Persisted user choice when local WebGPU is unavailable (see Epic 4 / V2 cloud inference). */
export const AI_DELIVERY_MODE_KEY = "divinotes-ai-delivery-mode";

export type AiDeliveryMode = "local-webgpu" | "cloud-only-v2";

export function getStoredAiDeliveryMode(): AiDeliveryMode | null {
	if (typeof localStorage === "undefined") return null;
	const v = localStorage.getItem(AI_DELIVERY_MODE_KEY);
	return v === "cloud-only-v2" || v === "local-webgpu" ? v : null;
}

export function setStoredAiDeliveryMode(mode: AiDeliveryMode): void {
	localStorage.setItem(AI_DELIVERY_MODE_KEY, mode);
}
