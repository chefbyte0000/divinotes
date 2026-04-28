/**
 * Worker-only project-scoped vector retrieval for RAG.
 *
 * Voy (`voy-search`) was attempted for Task 4.7; its WASM failed to bundle inside Vite’s worker
 * pipeline (Rolldown wasm fallback). This module keeps embeddings + `projectKey` metadata so a
 * Voy/HNSW backend can swap in later without changing worker protocol types.
 */
import type { SearchContextSnippet } from "./ai-protocol";
import { embedTextForRag } from "./embedding-pipeline";

const DB_NAME = "divinotes-rag-v2";
const STORE = "vector-state";
const ROW_KEY = "default";

/** Stable bucket key — must match how notes partition General vs projects. */
export function projectScopeKey(projectId: string | null): string {
	return projectId ?? "__general__";
}

export type StoredNoteMeta = {
	projectKey: string;
	snippet: string;
	embedding: number[];
};

function cosineSimilarity(query: Float32Array, stored: number[]): number {
	let dot = 0;
	let nq = 0;
	let nv = 0;
	const len = Math.min(query.length, stored.length);
	for (let i = 0; i < len; i++) {
		const q = query[i]!;
		const v = stored[i]!;
		dot += q * v;
		nq += q * q;
		nv += v * v;
	}
	const denom = Math.sqrt(nq) * Math.sqrt(nv);
	return denom === 0 ? 0 : dot / denom;
}

export class RagVectorStore {
	private meta = new Map<string, StoredNoteMeta>();
	private persistTimer: ReturnType<typeof setTimeout> | null = null;

	private constructor(meta: Map<string, StoredNoteMeta>) {
		this.meta = meta;
	}

	static async create(): Promise<RagVectorStore> {
		const loaded = await loadFromIdb();
		if (loaded?.metaMap) {
			return new RagVectorStore(new Map(Object.entries(loaded.metaMap)));
		}
		return new RagVectorStore(new Map());
	}

	async upsert(noteId: string, projectId: string | null, text: string): Promise<void> {
		if (!text.trim()) {
			this.removeNote(noteId);
			return;
		}

		const snippet = text.trim().slice(0, 500) || " ";
		const embedding = await embedTextForRag(text);
		const embArr = Array.from(embedding);
		const pk = projectScopeKey(projectId);

		this.meta.set(noteId, { projectKey: pk, snippet, embedding: embArr });
		this.schedulePersist();
	}

	async searchContext(
		query: string,
		projectId: string | null,
		topK: number,
	): Promise<SearchContextSnippet[]> {
		const trimmed = query.trim();
		if (!trimmed || this.meta.size === 0) return [];

		const pk = projectScopeKey(projectId);
		const qEmb = await embedTextForRag(trimmed);

		const scored: { noteId: string; snippet: string; score: number }[] = [];

		for (const [noteId, row] of this.meta) {
			if (row.projectKey !== pk) continue;
			scored.push({
				noteId,
				snippet: row.snippet,
				score: cosineSimilarity(qEmb, row.embedding),
			});
		}

		scored.sort((a, b) => b.score - a.score);

		return scored.slice(0, topK).map((s) => ({
			noteId: s.noteId,
			projectId,
			snippet: s.snippet,
		}));
	}

	removeNote(noteId: string): void {
		if (!this.meta.has(noteId)) return;
		this.meta.delete(noteId);
		this.schedulePersist();
	}

	private schedulePersist(): void {
		if (this.persistTimer) clearTimeout(this.persistTimer);
		this.persistTimer = setTimeout(() => {
			this.persistTimer = null;
			void persistSnapshot(metaToRecord(this.meta));
		}, 400);
	}
}

function metaToRecord(m: Map<string, StoredNoteMeta>): Record<string, StoredNoteMeta> {
	return Object.fromEntries(m);
}

type IdbSnapshot = {
	version: 1;
	metaMap: Record<string, StoredNoteMeta>;
};

async function loadFromIdb(): Promise<IdbSnapshot | null> {
	return new Promise((resolve) => {
		const req = indexedDB.open(DB_NAME, 1);
		req.onupgradeneeded = () => {
			const db = req.result;
			if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
		};
		req.onerror = () => resolve(null);
		req.onsuccess = () => {
			const db = req.result;
			try {
				const tx = db.transaction(STORE, "readonly");
				const get = tx.objectStore(STORE).get(ROW_KEY);
				get.onsuccess = () => {
					const v = get.result as IdbSnapshot | undefined;
					if (v && v.version === 1 && v.metaMap) resolve(v);
					else resolve(null);
				};
				get.onerror = () => resolve(null);
			} catch {
				resolve(null);
			}
		};
	});
}

async function persistSnapshot(metaMap: Record<string, StoredNoteMeta>): Promise<void> {
	const snapshot: IdbSnapshot = { version: 1, metaMap };
	return new Promise((resolve) => {
		const req = indexedDB.open(DB_NAME, 1);
		req.onupgradeneeded = () => {
			const db = req.result;
			if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
		};
		req.onerror = () => resolve();
		req.onsuccess = () => {
			const db = req.result;
			try {
				const tx = db.transaction(STORE, "readwrite");
				tx.objectStore(STORE).put(snapshot, ROW_KEY);
				tx.oncomplete = () => resolve();
				tx.onerror = () => resolve();
			} catch {
				resolve();
			}
		};
	});
}
