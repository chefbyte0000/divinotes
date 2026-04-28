/**
 * Project-scoped semantic retrieval for RAG — delegates to the shared AI worker + Voy store.
 */
import { browser } from "$app/environment";
import type { SearchContextSnippet } from "./ai-protocol";
import { getInferenceClient } from "./inference-bootstrap";

/**
 * Returns up to three note snippets most similar to `query`, **only** from the given project silo.
 * `projectId === null` restricts to the General workspace bucket (same convention as notes).
 */
export async function searchContext(
	query: string,
	projectId: string | null,
): Promise<SearchContextSnippet[]> {
	if (!browser) return [];
	const client = getInferenceClient();
	if (!client) return [];
	try {
		return await client.searchContext(query, projectId, 3);
	} catch {
		return [];
	}
}
