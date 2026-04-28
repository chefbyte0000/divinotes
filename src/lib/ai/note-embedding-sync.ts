/**
 * Sync hook: after a note is persisted, push plain text to the worker for embedding + Voy upsert.
 */
import { browser } from "$app/environment";
import { getInferenceClient } from "./inference-bootstrap";

export function queueNoteEmbeddingSync(args: {
	noteId: string;
	projectId: string | null;
	plainText: string;
}): void {
	if (!browser) return;
	const client = getInferenceClient();
	if (!client) return;
	void client
		.syncNoteEmbedding({
			noteId: args.noteId,
			projectId: args.projectId,
			text: args.plainText,
		})
		.catch((err: unknown) => {
			console.warn("[divinotes] note embedding sync failed", err);
		});
}
