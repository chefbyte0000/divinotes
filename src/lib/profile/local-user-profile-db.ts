/**
 * On-device user profile / insights — IndexedDB only.
 *
 * IMPORTANT: Do not add routes, Drizzle tables, or PowerSync buckets for this data.
 * It must never leave the device (see `.cursorrules` activity log / sovereignty).
 */
import { browser } from "$app/environment";
import type { LocalUserProfile } from "./local-user-profile-types";

export type { LocalUserProfile } from "./local-user-profile-types";

const DB_NAME = "divinotes-local-user-profile";
const DB_VERSION = 1;
const STORE = "profile";
const ROW_KEY = "default";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
	if (!browser || typeof indexedDB === "undefined") {
		return Promise.reject(new Error("local user profile is browser-only"));
	}
	if (!dbPromise) {
		dbPromise = new Promise((resolve, reject) => {
			const req = indexedDB.open(DB_NAME, DB_VERSION);
			req.onerror = () => reject(req.error ?? new Error("user profile IDB open failed"));
			req.onsuccess = () => resolve(req.result);
			req.onupgradeneeded = () => {
				const db = req.result;
				if (!db.objectStoreNames.contains(STORE)) {
					db.createObjectStore(STORE, { keyPath: "id" });
				}
			};
		});
	}
	return dbPromise;
}

type ProfileRow = LocalUserProfile & { id: typeof ROW_KEY };

function withDefaults(p: Partial<LocalUserProfile> | null): LocalUserProfile {
	return {
		version: 1,
		habitInsights: p?.habitInsights ?? "",
		lastDistilledAt: p?.lastDistilledAt ?? null,
	};
}

export async function loadLocalUserProfile(): Promise<LocalUserProfile> {
	if (!browser) {
		return withDefaults(null);
	}
	try {
		const db = await openDb();
		return await new Promise((resolve, reject) => {
			const tx = db.transaction(STORE, "readonly");
			const get = tx.objectStore(STORE).get(ROW_KEY);
			get.onerror = () => reject(get.error ?? new Error("user profile read failed"));
			get.onsuccess = () => {
				const row = get.result as ProfileRow | undefined;
				resolve(withDefaults(row ?? null));
			};
		});
	} catch {
		return withDefaults(null);
	}
}

export async function saveLocalUserProfile(next: LocalUserProfile): Promise<void> {
	const db = await openDb();
	const row: ProfileRow = { id: ROW_KEY, ...next };
	await new Promise<void>((resolve, reject) => {
		const tx = db.transaction(STORE, "readwrite");
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error ?? new Error("user profile write failed"));
		tx.objectStore(STORE).put(row);
	});
}

/** Replace synthesized habit text and stamp `lastDistilledAt`. */
export async function upsertHabitInsights(insights: string): Promise<void> {
	const prev = await loadLocalUserProfile();
	await saveLocalUserProfile({
		...prev,
		habitInsights: insights.trim(),
		lastDistilledAt: new Date().toISOString(),
	});
}
