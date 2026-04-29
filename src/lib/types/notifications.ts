/** Matches Postgres `notification_kind` enum and Drizzle `notificationKindEnum`. */
export type NotificationKind = "announcement" | "information" | "alert" | "reminder";

export const NOTIFICATION_KIND_OPTIONS: { value: NotificationKind; label: string }[] = [
	{ value: "announcement", label: "Announcement" },
	{ value: "information", label: "Information" },
	{ value: "alert", label: "Alert" },
	{ value: "reminder", label: "Reminder" },
];

export const RECURRENCE_INTERVAL_OPTIONS: { value: "daily" | "weekly" | "monthly"; label: string }[] = [
	{ value: "daily", label: "Daily" },
	{ value: "weekly", label: "Weekly" },
	{ value: "monthly", label: "Monthly" },
];

export const WEEKDAY_UTC_OPTIONS: { value: number; label: string }[] = [
	{ value: 0, label: "Sunday (UTC)" },
	{ value: 1, label: "Monday (UTC)" },
	{ value: 2, label: "Tuesday (UTC)" },
	{ value: 3, label: "Wednesday (UTC)" },
	{ value: 4, label: "Thursday (UTC)" },
	{ value: 5, label: "Friday (UTC)" },
	{ value: 6, label: "Saturday (UTC)" },
];
