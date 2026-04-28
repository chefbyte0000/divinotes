import type { ColumnDef } from "tanstack-table-8-svelte-5";
import { renderComponent } from "tanstack-table-8-svelte-5";
import DataTableColumnHeader from "$lib/components/ui/data-table/data-table-column-header.svelte";
import DataTableCheckbox from "$lib/components/ui/data-table/data-table-checkbox.svelte";
import DataTableRowActions from "$lib/components/ui/data-table/data-table-row-actions.svelte";
import UserCell from "./user-cell.svelte";
import StatusCell from "./status-cell.svelte";
import RoleCell from "./role-cell.svelte";

// Perfectly aligned with typeof users.$inferSelect from schema.ts
export type UserRow = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: "admin" | "premium" | "standard";
  emailVerified: Date | null;
};

export const columns: ColumnDef<UserRow>[] = [
  {
    id: "select",
    header: ({ table }) =>
      renderComponent(DataTableCheckbox, {
        checked: table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate"),
        onCheckedChange: (value: boolean) => table.toggleAllPageRowsSelected(!!value),
        ariaLabel: "Select all",
      }),
    cell: ({ row }) =>
      renderComponent(DataTableCheckbox, {
        checked: row.getIsSelected(),
        onCheckedChange: (value: boolean) => row.toggleSelected(!!value),
        ariaLabel: "Select row",
      }),
    enableSorting: false,
    enableHiding: false,
    size: 40,
  },
  {
    accessorKey: "email",
    header: ({ column, header }) => renderComponent(DataTableColumnHeader, { column, header, title: "User" }),
    cell: ({ row }) =>
      renderComponent(UserCell, {
        name: row.original.name || "Unknown User",
        email: row.original.email,
        avatar: row.original.image || "",
      }),
    filterFn: "includesString",
    size: 250,
  },
  {
    accessorKey: "role",
    header: ({ column, header }) => renderComponent(DataTableColumnHeader, { column, header, title: "Role" }),
    cell: ({ row }) =>
      renderComponent(RoleCell, {
        userId: row.original.id,
        currentRole: row.original.role,
      }),
    filterFn: (row, id, filterValue) => {
      return !filterValue || row.getValue(id) === filterValue;
    },
    size: 150,
  },
  {
    id: "status",
    accessorFn: (row) => (row.emailVerified ? "Active" : "Pending"),
    header: ({ column, header }) => renderComponent(DataTableColumnHeader, { column, header, title: "Status" }),
    cell: ({ row }) => renderComponent(StatusCell, { status: row.getValue("status") }),
    filterFn: (row, id, filterValue) => {
      const status = row.getValue(id) as string;
      return !filterValue || status === filterValue;
    },
    size: 120,
  },
  {
    id: "actions",
    cell: ({ row }) => renderComponent(DataTableRowActions, { id: row.original.id }),
    enableHiding: false,
    enableResizing: false,
    size: 50,
  },
];