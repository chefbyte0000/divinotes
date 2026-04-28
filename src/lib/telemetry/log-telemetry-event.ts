import { browser } from "$app/environment";
import type { TelemetryEventRow } from "./local-telemetry-schema";
import { insertTelemetryEvent } from "./local-telemetry-db";

export type LogTelemetryInput = {
	event_type: string;
	projectId: string | null;
	payload?: Record<string, unknown>;
	/** Defaults to now */
	timestamp?: string;
};

/**
 * Append one row to the device-local telemetry ledger. Safe to fire-and-forget from UI.
 */
export function logTelemetryEvent(input: LogTelemetryInput): void {
	if (!browser) return;

	const row: TelemetryEventRow = {
		id: crypto.randomUUID(),
		event_type: input.event_type,
		projectId: input.projectId,
		payload: input.payload ?? {},
		timestamp: input.timestamp ?? new Date().toISOString(),
	};

	void insertTelemetryEvent(row).catch((err: unknown) => {
		console.warn("[divinotes] telemetry insert failed", err);
	});
}
