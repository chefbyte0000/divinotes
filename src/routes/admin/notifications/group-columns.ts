import type { ColumnDef } from "tanstack-table-8-svelte-5";
import { renderComponent } from "tanstack-table-8-svelte-5";
import DataTableColumnHeader from "$lib/components/ui/data-table/data-table-column-header.svelte";
import NotificationGroupRowActions from "./notification-group-row-actions.svelte";

export type AdminGroupRow = {
	id: string;
	name: string;
	memberUserIds: string[];
	memberCount: number;
	createdAt: string | null;
	updatedAt: string | null;
};

export function createGroupColumns(): ColumnDef<AdminGroupRow>[] {
	return [
		{
			accessorKey: "name",
			header: ({ column, header }) =>
				renderComponent(DataTableColumnHeader, { column, header, title: "Name" }),
			size: 200,
		},
		{
			accessorKey: "memberCount",
			header: ({ column, header }) =>
				renderComponent(DataTableColumnHeader, { column, header, title: "Members" }),
			size: 100,
		},
		{
			id: "preview",
			accessorFn: (row) => row.memberUserIds.slice(0, 4).join(" "),
			header: ({ column, header }) =>
				renderComponent(DataTableColumnHeader, { column, header, title: "Sample ids" }),
			cell: ({ row }) => {
				const ids = row.original.memberUserIds;
				if (!ids.length) return "—";
				const preview = ids.slice(0, 3).join(", ");
				return ids.length > 3 ? `${preview}…` : preview;
			},
			size: 240,
		},
		{
			accessorKey: "updatedAt",
			header: ({ column, header }) =>
				renderComponent(DataTableColumnHeader, { column, header, title: "Updated" }),
			cell: ({ row }) => row.original.updatedAt?.replace("T", " ").slice(0, 16) ?? "—",
			size: 150,
		},
		{
			id: "actions",
			header: "",
			cell: ({ row }) =>
				renderComponent(NotificationGroupRowActions, {
					group: row.original,
				}),
			size: 52,
		},
	];
}
