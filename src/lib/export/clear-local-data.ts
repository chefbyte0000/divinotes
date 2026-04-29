/**
 * GDPR-oriented wipe of device-local Divinotes stores (telemetry, profile, RAG mirrors).
 * Does not touch synced Postgres rows — pair with remote DELETE `/api/account` first or after policy choice.
 */
import { DEFAULT_MODEL_CACHE_NAME } from "$lib/ai/model-manager";

const INDEXED_DB_NAMES = [
	"divinotes-local-telemetry",
	"divinotes-local-user-profile",
	"divinotes-rag-v2",
] as const;

function deleteIndexedDb(name: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const req = indexedDB.deleteDatabase(name);
		req.onsuccess = () => resolve();
		req.onerror = () => reject(req.error ?? new Error(`failed to delete ${name}`));
		req.onblocked = () => resolve();
	});
}

export async function clearDivinotesIndexedDb(): Promise<void> {
	await Promise.all(INDEXED_DB_NAMES.map(deleteIndexedDb));
}

export async function clearDivinotesCaches(): Promise<void> {
	if (typeof caches === "undefined") return;
	try {
		await caches.delete(DEFAULT_MODEL_CACHE_NAME);
	} catch {
		/* ignore */
	}
}

export async function clearAllDivinotesLocalData(): Promise<void> {
	await clearDivinotesIndexedDb();
	await clearDivinotesCaches();
}
