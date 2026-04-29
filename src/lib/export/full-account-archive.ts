import { browser } from "$app/environment";
import JSZip from "jszip";

import { loadLocalUserProfile } from "$lib/profile/local-user-profile-db";
import { readAllTelemetryEvents } from "$lib/telemetry/local-telemetry-db";

import type { AccountZipManifest, FullArchivePayloadV1 } from "./archive-types";

export type ArchiveProgress = {
	phase: string;
	currentFile: number;
	totalFiles: number;
	message: string;
};

function yieldUi(): Promise<void> {
	return new Promise((r) => setTimeout(r, 0));
}

export async function fetchSyncedArchivePayload(): Promise<FullArchivePayloadV1> {
	const r = await fetch("/api/account/full-archive");
	if (!r.ok) throw new Error(`Archive fetch failed (${r.status})`);
	return r.json() as Promise<FullArchivePayloadV1>;
}

/** Bundles `data.json`, optional `/media` scaffolding, with granular UI-friendly progress. */
export async function buildFullAccountZipBlob(
	onProgress?: (p: ArchiveProgress) => void,
): Promise<Blob> {
	if (!browser) throw new Error("Archive export runs in the browser only.");

	onProgress?.({
		phase: "download",
		currentFile: 0,
		totalFiles: 3,
		message: "Downloading synced snapshot…",
	});

	const synced = await fetchSyncedArchivePayload();
	await yieldUi();

	onProgress?.({
		phase: "local",
		currentFile: 1,
		totalFiles: 3,
		message: "Reading device-local habits & insights…",
	});

	const telemetryEvents = await readAllTelemetryEvents();
	const userProfile = await loadLocalUserProfile();
	await yieldUi();

	const manifest: AccountZipManifest = {
		...synced,
		local: { telemetryEvents, userProfile },
	};

	const dataJson = JSON.stringify(manifest, null, 2);

	const zip = new JSZip();
	const entries = [
		{ path: "data.json", data: dataJson },
		{
			path: "media/README.txt",
			data: "Reserved for attachments referenced from exported notes (future).\n",
		},
	];

	let done = 0;
	const totalFiles = entries.length + 1;
	for (const e of entries) {
		zip.file(e.path, e.data);
		done += 1;
		onProgress?.({
			phase: "zip",
			currentFile: done,
			totalFiles,
			message: `Adding ${e.path} (${done} of ${totalFiles})`,
		});
		await yieldUi();
	}

	onProgress?.({
		phase: "compress",
		currentFile: totalFiles,
		totalFiles,
		message: "Compressing ZIP…",
	});

	const blob = await zip.generateAsync(
		{
			type: "blob",
			compression: "DEFLATE",
			compressionOptions: { level: 6 },
		},
		(meta) => {
			const pct = Math.round(meta.percent ?? 0);
			const cur = meta.currentFile;
			onProgress?.({
				phase: "compress",
				currentFile: pct,
				totalFiles: 100,
				message: cur
					? `Zipping ${cur} — ${pct}%`
					: `Compressing archive… ${pct}%`,
			});
		},
	);

	return blob;
}
