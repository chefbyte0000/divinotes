import type { ColumnDef } from "tanstack-table-8-svelte-5";
import { renderComponent } from "tanstack-table-8-svelte-5";
import DataTableColumnHeader from "$lib/components/ui/data-table/data-table-column-header.svelte";
import NotificationCampaignRowActions from "./notification-campaign-row-actions.svelte";
import type { NotificationAudienceV1, NotificationScheduleV1 } from "$lib/server/db/schema";
import { summarizeAudience, summarizeSchedule } from "$lib/notifications/campaign-format";

export type AdminCampaignRow = {
	id: string;
	title: string;
	body: string;
	kind: "announcement" | "information" | "alert" | "reminder";
	audience: NotificationAudienceV1;
	schedule: NotificationScheduleV1;
	isRecurring: boolean;
	nextFireAt: string | null;
	lastFiredAt: string | null;
	isActive: boolean;
	lastRecipientCount: number | null;
	createdAt: string | null;
	createdByUserId: string;
	creatorName: string | null;
	creatorEmail: string;
};

function statusLabel(row: AdminCampaignRow): string {
	if (!row.isRecurring && !row.isActive) return "Completed";
	if (!row.isActive) return "Paused";
	return row.isRecurring ? "Active" : "Completed";
}

function matchesGlobalSearch(row: AdminCampaignRow, filterValue: unknown): boolean {
	if (filterValue === undefined || filterValue === "") return true;
	const q = String(filterValue).toLowerCase().trim();
	const haystack = [
		row.title,
		row.body,
		row.kind,
		statusLabel(row),
		row.creatorName ?? "",
		row.creatorEmail,
		summarizeAudience(row.audience),
		summarizeSchedule(row.schedule),
		row.id,
	]
		.join(" ")
		.toLowerCase();
	return haystack.includes(q);
}

export function createCampaignColumns(): ColumnDef<AdminCampaignRow>[] {
	return [
		{
			id: "title",
			accessorKey: "title",
			header: ({ column, header }) =>
				renderComponent(DataTableColumnHeader, { column, header, title: "Title" }),
			cell: ({ row }) => {
				const t = row.original.title;
				return t.length > 48 ? `${t.slice(0, 48)}…` : t;
			},
			filterFn: (row, _columnId, filterValue) => matchesGlobalSearch(row.original, filterValue),
			size: 220,
		},
		{
			accessorKey: "kind",
			header: ({ column, header }) =>
				renderComponent(DataTableColumnHeader, { column, header, title: "Type" }),
			cell: ({ row }) => row.original.kind,
			filterFn: (row, id, filterValue) => !filterValue || row.getValue(id) === filterValue,
			size: 120,
		},
		{
			id: "audience",
			accessorFn: (row) => summarizeAudience(row.audience),
			header: ({ column, header }) =>
				renderComponent(DataTableColumnHeader, { column, header, title: "Audience" }),
			size: 160,
		},
		{
			id: "schedule",
			accessorFn: (row) => summarizeSchedule(row.schedule),
			header: ({ column, header }) =>
				renderComponent(DataTableColumnHeader, { column, header, title: "Schedule" }),
			size: 200,
		},
		{
			id: "status",
			accessorFn: (row) => statusLabel(row),
			header: ({ column, header }) =>
				renderComponent(DataTableColumnHeader, { column, header, title: "Status" }),
			filterFn: (row, id, filterValue) => !filterValue || row.getValue(id) === filterValue,
			size: 100,
		},
		{
			id: "nextFireAt",
			accessorKey: "nextFireAt",
			header: ({ column, header }) =>
				renderComponent(DataTableColumnHeader, { column, header, title: "Next send" }),
			cell: ({ row }) => row.original.nextFireAt?.replace("T", " ").slice(0, 16) ?? "—",
			size: 150,
		},
		{
			id: "lastRecipientCount",
			accessorKey: "lastRecipientCount",
			header: ({ column, header }) =>
				renderComponent(DataTableColumnHeader, { column, header, title: "Recipients" }),
			cell: ({ row }) => row.original.lastRecipientCount ?? "—",
			size: 100,
		},
		{
			id: "createdAt",
			accessorKey: "createdAt",
			header: ({ column, header }) =>
				renderComponent(DataTableColumnHeader, { column, header, title: "Created" }),
			cell: ({ row }) => row.original.createdAt?.replace("T", " ").slice(0, 16) ?? "—",
			size: 150,
		},
		{
			id: "actions",
			header: "",
			cell: ({ row }) =>
				renderComponent(NotificationCampaignRowActions, {
					campaignId: row.original.id,
					isActive: row.original.isActive,
					isRecurring: row.original.isRecurring,
				}),
			enableHiding: false,
			size: 52,
		},
	];
}
