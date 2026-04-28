/**
 * Device-local telemetry ledger (never synced). Stored in IndexedDB with relational-style columns.
 */
export type TelemetryEventRow = {
	id: string;
	event_type: string;
	projectId: string | null;
	payload: Record<string, unknown>;
	/** ISO 8601 — mirrors Postgres `timestamp with time zone` ergonomically in devtools */
	timestamp: string;
};
