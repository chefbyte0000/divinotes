/**
 * IndexedDB backing store for the local telemetry ledger (Task 6.1).
 * Maps to columns: id, event_type, projectId, payload, timestamp.
 */
import type { TelemetryEventRow } from "./local-telemetry-schema";

const DB_NAME = "divinotes-local-telemetry";
const DB_VERSION = 1;
const STORE = "telemetry_events";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
	if (typeof indexedDB === "undefined") {
		return Promise.reject(new Error("indexedDB unavailable"));
	}
	if (!dbPromise) {
		dbPromise = new Promise((resolve, reject) => {
			const req = indexedDB.open(DB_NAME, DB_VERSION);
			req.onerror = () => reject(req.error ?? new Error("IDB open failed"));
			req.onsuccess = () => resolve(req.result);
			req.onupgradeneeded = () => {
				const db = req.result;
				if (!db.objectStoreNames.contains(STORE)) {
					const os = db.createObjectStore(STORE, { keyPath: "id" });
					os.createIndex("event_type", "event_type", { unique: false });
					os.createIndex("projectId", "projectId", { unique: false });
					os.createIndex("timestamp", "timestamp", { unique: false });
				}
			};
		});
	}
	return dbPromise;
}

export async function insertTelemetryEvent(row: TelemetryEventRow): Promise<void> {
	const db = await openDb();
	await new Promise<void>((resolve, reject) => {
		const tx = db.transaction(STORE, "readwrite");
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error ?? new Error("telemetry insert failed"));
		tx.objectStore(STORE).put(row);
	});
}

/** All events with `timestamp >= cutoffIso` (ISO strings sort chronologically in the index). */
export async function listTelemetrySince(cutoffIso: string): Promise<TelemetryEventRow[]> {
	const db = await openDb();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, "readonly");
		const idx = tx.objectStore(STORE).index("timestamp");
		const range = IDBKeyRange.lowerBound(cutoffIso);
		const req = idx.openCursor(range, "next");
		const out: TelemetryEventRow[] = [];
		req.onerror = () => reject(req.error ?? new Error("telemetry range read failed"));
		req.onsuccess = () => {
			const cur = req.result;
			if (!cur) {
				resolve(out);
				return;
			}
			out.push(cur.value as TelemetryEventRow);
			cur.continue();
		};
	});
}

/** Optional: read recent rows for debugging / future exporter UI */
/** Full table scan — used for optional device-local export bundles (never synced). */
export async function readAllTelemetryEvents(): Promise<TelemetryEventRow[]> {
	const db = await openDb();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, "readonly");
		const req = tx.objectStore(STORE).openCursor();
		const out: TelemetryEventRow[] = [];
		req.onerror = () => reject(req.error ?? new Error("telemetry full read failed"));
		req.onsuccess = () => {
			const cur = req.result;
			if (!cur) {
				out.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
				resolve(out);
				return;
			}
			out.push(cur.value as TelemetryEventRow);
			cur.continue();
		};
	});
}

export async function readTelemetryEventsRecent(limit: number): Promise<TelemetryEventRow[]> {
	const db = await openDb();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, "readonly");
		const os = tx.objectStore(STORE);
		const idx = os.index("timestamp");
		const req = idx.openCursor(null, "prev");
		const out: TelemetryEventRow[] = [];
		req.onerror = () => reject(req.error ?? new Error("telemetry read failed"));
		req.onsuccess = () => {
			const cur = req.result;
			if (!cur || out.length >= limit) {
				resolve(out);
				return;
			}
			out.push(cur.value as TelemetryEventRow);
			cur.continue();
		};
	});
}
