/**
 * Browser-native save — correct MIME where known; falls back to octet-stream.
 */
export type DownloadBlobOptions = {
	filename: string;
	mimeType?: string;
};

export function triggerBlobDownload(blob: Blob, opts: DownloadBlobOptions): void {
	if (typeof window === "undefined" || typeof document === "undefined") return;
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = opts.filename;
	a.rel = "noopener";
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function blobFromText(text: string, mimeType: string): Blob {
	return new Blob([text], { type: mimeType });
}
