/**
 * Pure display helpers for admin campaign tables — safe for the browser.
 * (Keep in sync with `NotificationAudienceV1` / `NotificationScheduleV1` in schema.)
 */

export function summarizeAudience(audience: {
	version?: number;
	scope?: string;
	roles?: string[];
	userIds?: string[];
	groupId?: string;
}): string {
	if (audience.version !== 1) return "Unknown";
	switch (audience.scope) {
		case "all":
			return "Everyone";
		case "roles":
			return `Roles: ${(audience.roles ?? []).join(", ") || "—"}`;
		case "users":
			return `${audience.userIds?.length ?? 0} user(s)`;
		case "group":
			return `Group (${audience.groupId?.slice(0, 8) ?? "?"})`;
		default:
			return "Custom";
	}
}

export function summarizeSchedule(schedule: {
	version?: number;
	mode?: string;
	interval?: string;
	hourUtc?: number;
	minuteUtc?: number;
	weekdayUtc?: number;
	dayOfMonth?: number;
}): string {
	if (schedule.mode === "once") return "One-time";
	const hourUtc = schedule.hourUtc ?? 9;
	const minuteUtc = schedule.minuteUtc ?? 0;
	const { interval, weekdayUtc, dayOfMonth } = schedule;
	const t = `${String(hourUtc).padStart(2, "0")}:${String(minuteUtc).padStart(2, "0")} UTC`;
	if (interval === "daily") return `Every day @ ${t}`;
	if (interval === "weekly") return `Weekly (weekday ${weekdayUtc ?? 1}) @ ${t}`;
	return `Monthly (day ${dayOfMonth ?? 1}) @ ${t}`;
}
