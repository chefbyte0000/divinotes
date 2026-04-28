/**
 * Background habit synthesis: rolls up local telemetry into Gemma output via the inference worker.
 * Runs on the main thread; pair with `bootLocalInference()` so the model is loaded first.
 */
import { browser } from "$app/environment";
import { saveHabitInsights } from "$lib/profile/user-profile-store.svelte";
import { listTelemetrySince } from "$lib/telemetry/local-telemetry-db";
import type { TelemetryEventRow } from "$lib/telemetry/local-telemetry-schema";
import { getInferenceClient } from "./inference-bootstrap";

const HOURS_WINDOW = 24;

/** System prompt label requested by epic — expanded so Gemma behaves usefully. */
export const DISTILL_HABITS_SYSTEM_PROMPT = [
	"Distill Habits.",
	"You analyze anonymized local interaction telemetry from a single user's Divinotes session.",
	"Produce concise, supportive hypotheses about recurring workflows and rituals — not judgments.",
	"Prefer a short markdown bullet list; mention uncertainty when signals are weak.",
	"Never invent timestamps or events that are not implied by the log lines.",
].join("\n");

export type HabitSynthesizeResult =
	| { status: "complete"; insights: string; eventCount: number }
	| { status: "skipped"; reason: "no_logs" | "not_browser" | "no_inference_client" }
	| { status: "error"; message: string };

function formatTelemetryWindow(rows: TelemetryEventRow[]): string {
	if (rows.length === 0) return "(no events in window)";
	const lines = rows.map((r) => {
		const payload =
			r.payload && Object.keys(r.payload).length > 0 ? JSON.stringify(r.payload) : "{}";
		return `[${r.timestamp}] ${r.event_type} | projectId=${r.projectId ?? "null"} | ${payload}`;
	});
	return lines.join("\n");
}

/**
 * Reads telemetry from the last 24 hours, formats it, sends it to the Gemma worker with the
 * Distill Habits system prompt, persists insights to the on-device UserProfile store.
 */
export async function synthesizeHabitsFromTelemetry(): Promise<HabitSynthesizeResult> {
	if (!browser) {
		return { status: "skipped", reason: "not_browser" };
	}

	const cutoff = new Date(Date.now() - HOURS_WINDOW * 60 * 60 * 1000).toISOString();
	const rows = await listTelemetrySince(cutoff);
	if (rows.length === 0) {
		return { status: "skipped", reason: "no_logs" };
	}

	const client = getInferenceClient();
	if (!client) {
		return { status: "skipped", reason: "no_inference_client" };
	}

	const userBlob = [
		`Telemetry window: last ${HOURS_WINDOW} hours (since ${cutoff})`,
		`Event count: ${rows.length}`,
		"",
		formatTelemetryWindow(rows),
	].join("\n");

	let assembled = "";
	try {
		for await (const chunk of client.generateCompletion({
			mode: "chat",
			messages: [
				{ role: "system", content: DISTILL_HABITS_SYSTEM_PROMPT },
				{ role: "user", content: userBlob },
			],
			stream: true,
			temperature: 0.35,
			max_tokens: 900,
		})) {
			assembled += chunk;
		}
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return { status: "error", message };
	}

	const insights = assembled.trim();
	if (!insights) {
		return { status: "error", message: "empty model output" };
	}

	await saveHabitInsights(insights);

	return { status: "complete", insights, eventCount: rows.length };
}
