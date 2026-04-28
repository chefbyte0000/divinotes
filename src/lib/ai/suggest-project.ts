/**
 * Placeholder for Gemma-backed project suggestion from note content.
 * Wire WebGPU inference here later; keep calls async so UI can await.
 */
export async function suggestProject(noteContent: string): Promise<{
	suggestedProjectId: string | null;
	reason?: string;
}> {
	void noteContent;
	return Promise.resolve({ suggestedProjectId: null });
}
