import type { ColumnDef } from "tanstack-table-8-svelte-5";
import { renderComponent } from "tanstack-table-8-svelte-5";
import DataTableColumnHeader from "$lib/components/ui/data-table/data-table-column-header.svelte";
import DataTableCheckbox from "$lib/components/ui/data-table/data-table-checkbox.svelte";
import AdminUsersRowActions from "./admin-users-row-actions.svelte";
import UserCell from "./user-cell.svelte";
import EmailCell from "./email-cell.svelte";
import StatusCell from "./status-cell.svelte";
import RoleCell from "./role-cell.svelte";
import VerifiedCell from "./verified-cell.svelte";

export type UserRow = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: "admin" | "premium" | "standard";
  emailVerified: Date | null;
};

function matchesGlobalSearch(row: UserRow, filterValue: unknown): boolean {
  if (filterValue === undefined || filterValue === "") return true;
  const q = String(filterValue).toLowerCase().trim();
  const haystack = [
    row.name ?? "",
    row.email,
    row.role,
    row.emailVerified ? "active verified" : "pending unverified",
    row.id,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function createColumns(options: {
  actorUserId: string;
  allowImpersonate: boolean;
}): ColumnDef<UserRow>[] {
  const { actorUserId, allowImpersonate } = options;

  return [
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
      id: "name",
      accessorFn: (row) => row.name?.trim() ?? "",
      header: ({ column, header }) =>
        renderComponent(DataTableColumnHeader, { column, header, title: "Name" }),
      cell: ({ row }) =>
        renderComponent(UserCell, {
          name: row.original.name,
          avatar: row.original.image || "",
          emailHint: row.original.email,
        }),
      filterFn: (row, _columnId, filterValue) => matchesGlobalSearch(row.original, filterValue),
      size: 200,
    },
    {
      accessorKey: "email",
      header: ({ column, header }) =>
        renderComponent(DataTableColumnHeader, { column, header, title: "Email" }),
      cell: ({ row }) =>
        renderComponent(EmailCell, {
          email: row.original.email,
        }),
      size: 240,
    },
    {
      accessorKey: "role",
      header: ({ column, header }) =>
        renderComponent(DataTableColumnHeader, { column, header, title: "Role" }),
      cell: ({ row }) =>
        renderComponent(RoleCell, {
          userId: row.original.id,
          currentRole: row.original.role,
          locked: row.original.id === actorUserId,
        }),
      filterFn: (row, id, filterValue) => {
        return !filterValue || row.getValue(id) === filterValue;
      },
      size: 160,
    },
    {
      id: "status",
      accessorFn: (row) => (row.emailVerified ? "active" : "pending"),
      header: ({ column, header }) =>
        renderComponent(DataTableColumnHeader, { column, header, title: "Status" }),
      cell: ({ row }) =>
        renderComponent(StatusCell, {
          status: row.getValue("status") as "active" | "pending",
        }),
      filterFn: (row, id, filterValue) => {
        const status = row.getValue(id) as string;
        return !filterValue || status === filterValue;
      },
      size: 110,
    },
    {
      id: "verified",
      accessorFn: (row) => row.emailVerified,
      header: ({ column, header }) =>
        renderComponent(DataTableColumnHeader, { column, header, title: "Verified" }),
      cell: ({ row }) =>
        renderComponent(VerifiedCell, {
          verifiedAt: row.original.emailVerified,
        }),
      size: 180,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) =>
        renderComponent(AdminUsersRowActions, {
          userId: row.original.id,
          actorUserId,
          allowImpersonate,
        }),
      enableHiding: false,
      enableResizing: false,
      size: 52,
    },
  ];
}
