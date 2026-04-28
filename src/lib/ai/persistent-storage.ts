/**
 * Browser Storage API helpers so large Cache Storage payloads are less likely to be evicted.
 * Call `requestPersistentStorage()` from a user gesture when possible (Chrome requirement).
 */

export async function isStoragePersisted(): Promise<boolean> {
	if (typeof navigator === "undefined" || !navigator.storage?.persisted) {
		return false;
	}
	try {
		return await navigator.storage.persisted();
	} catch {
		return false;
	}
}

/**
 * Asks the browser not to treat origin storage as disposable during cleanup.
 * Resolution depends on engagement, installed PWA, etc.
 */
export async function requestPersistentStorage(): Promise<boolean> {
	if (typeof navigator === "undefined" || !navigator.storage?.persist) {
		return false;
	}
	try {
		return await navigator.storage.persist();
	} catch {
		return false;
	}
}

export type StorageEstimateResult = {
	usageBytes: number;
	quotaBytes: number;
};

export async function getStorageEstimate(): Promise<StorageEstimateResult | null> {
	if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
		return null;
	}
	try {
		const e = await navigator.storage.estimate();
		return {
			usageBytes: e.usage ?? 0,
			quotaBytes: e.quota ?? 0,
		};
	} catch {
		return null;
	}
}
