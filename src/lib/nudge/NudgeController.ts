/**
 * Chooses at most one lightweight UI nudge from **project scope** + **local time of day**.
 *
 * Pass `activeProjectId` from the **resource being viewed** when it can disagree with the URL
 * (e.g. `/note/[id]` notes carry `project_id` while `tryGetActiveProject()` only reflects `/project/...`).
 *
 * Not persisted — purely heuristic UI guidance (Epic 6 Phase 3).
 */

export type TimeOfDayBucket = "morning" | "afternoon" | "evening" | "night";

/** Local wall-clock buckets (user timezone). */
export function bucketTimeOfDay(now: Date = new Date()): TimeOfDayBucket {
	const h = now.getHours();
	if (h >= 5 && h < 12) return "morning";
	if (h >= 12 && h < 17) return "afternoon";
	if (h >= 17 && h < 22) return "evening";
	return "night";
}

export type NudgeOffer = {
	id: string;
	title: string;
	description?: string;
	primary?: { label: string };
	dismissLabel?: string;
};

function pickNudge(activeProjectId: string | null, now: Date): NudgeOffer | null {
	const general = activeProjectId === null;
	const tod = bucketTimeOfDay(now);

	if (general && tod === "morning") {
		return {
			id: "general-morning-anchor",
			title: "Start with intention",
			description:
				"General captures everything — when a theme emerges, move notes into a project so context stays clean.",
			primary: { label: "Open projects" },
			dismissLabel: "Not now",
		};
	}

	if (!general && tod === "afternoon") {
		return {
			id: "project-afternoon-check-in",
			title: "Still aligned?",
			description: "Quick skim of titles in this project beats perfect prose — adjust scope if the day shifted.",
			dismissLabel: "Dismiss",
		};
	}

	if (general && (tod === "evening" || tod === "night")) {
		return {
			id: "general-evening-close",
			title: "Close the loop",
			description: "Triage stray bullets into one next step — even a single line reduces reload tomorrow.",
			dismissLabel: "Later",
		};
	}

	if (!general && tod === "evening") {
		return {
			id: "project-evening-review",
			title: "Light review",
			description: "Note one win and one carry-over while this project is still in focus.",
			dismissLabel: "Dismiss",
		};
	}

	return null;
}

/**
 * Stateless evaluation — pass fresh `activeProjectId` from {@link tryGetActiveProject} or route params.
 */
export function evaluateNudge(input: { activeProjectId: string | null; now?: Date }): NudgeOffer | null {
	return pickNudge(input.activeProjectId, input.now ?? new Date());
}

/**
 * Listens by re-evaluating on an interval so **time-of-day** updates without navigation.
 * Always reads the latest `activeProjectId` from the supplied getter (route changes apply on next tick).
 */
export class NudgeController {
	constructor(private readonly getActiveProjectId: () => string | null) {}

	evaluate(now: Date = new Date()): NudgeOffer | null {
		return evaluateNudge({ activeProjectId: this.getActiveProjectId(), now });
	}

	/**
	 * Fires immediately, then every `intervalMs` (default 1 minute).
	 */
	observe(listener: (nudge: NudgeOffer | null) => void, intervalMs = 60_000): () => void {
		const run = () => listener(this.evaluate());
		run();
		const id = setInterval(run, intervalMs);
		return () => clearInterval(id);
	}
}
