import type { ColumnDef } from "tanstack-table-8-svelte-5";
import { renderComponent } from "tanstack-table-8-svelte-5";
import DataTableColumnHeader from "$lib/components/ui/data-table/data-table-column-header.svelte";
import type { ProjectNoteRow } from "$lib/types/project-notes";
import { sortKeyForTags } from "$lib/notes/note-tags";
import ProjectNoteTitleCell from "./project-note-title-cell.svelte";
import ProjectNoteDescriptionCell from "./project-note-description-cell.svelte";
import ProjectNoteTagsCell from "./project-note-tags-cell.svelte";
import ProjectNotePriorityCell from "./project-note-priority-cell.svelte";
import ProjectNoteUpdatedCell from "./project-note-updated-cell.svelte";
import ProjectNoteActionsCell from "./project-note-actions-cell.svelte";

function matchesSearch(row: ProjectNoteRow, filterValue: unknown): boolean {
	if (filterValue === undefined || filterValue === "") return true;
	const q = String(filterValue).toLowerCase().trim();
	const title = row.title?.trim() ?? "";
	const desc = row.description?.trim() ?? "";
	const tags = (row.metadata?.tags ?? []).join(" ").toLowerCase();
	return (
		title.toLowerCase().includes(q) ||
		desc.toLowerCase().includes(q) ||
		tags.includes(q) ||
		row.id.toLowerCase().includes(q)
	);
}

export function createProjectNotesColumns(): ColumnDef<ProjectNoteRow>[] {
	return [
		{
			accessorKey: "title",
			header: ({ column, header }) =>
				renderComponent(DataTableColumnHeader, { column, header, title: "Title" }),
			cell: ({ row }) =>
				renderComponent(ProjectNoteTitleCell, {
					noteId: row.original.id,
					title: row.original.title,
				}),
			filterFn: (row, _columnId, filterValue) => matchesSearch(row.original, filterValue),
			size: 260,
		},
		{
			id: "description",
			accessorFn: (row) => (row.description ?? "").trim(),
			header: ({ column, header }) =>
				renderComponent(DataTableColumnHeader, { column, header, title: "Description" }),
			cell: ({ row }) =>
				renderComponent(ProjectNoteDescriptionCell, {
					text: row.original.description ?? "",
				}),
			sortingFn: (rowA, rowB, columnId) => {
				const a = String(rowA.getValue(columnId) ?? "");
				const b = String(rowB.getValue(columnId) ?? "");
				return a.localeCompare(b, undefined, { sensitivity: "base" });
			},
			size: 220,
		},
		{
			accessorKey: "updatedAt",
			header: ({ column, header }) =>
				renderComponent(DataTableColumnHeader, { column, header, title: "Updated" }),
			cell: ({ row }) =>
				renderComponent(ProjectNoteUpdatedCell, { updatedAt: row.original.updatedAt }),
			sortingFn: (rowA, rowB, columnId) => {
				const ta = new Date(rowA.getValue(columnId) as string).getTime();
				const tb = new Date(rowB.getValue(columnId) as string).getTime();
				return ta - tb;
			},
			size: 200,
		},
		{
			id: "priority",
			accessorFn: (row) =>
				typeof row.metadata.priority === "number" && !Number.isNaN(row.metadata.priority)
					? row.metadata.priority
					: null,
			header: ({ column, header }) =>
				renderComponent(DataTableColumnHeader, { column, header, title: "Priority" }),
			cell: ({ row }) =>
				renderComponent(ProjectNotePriorityCell, {
					priority: row.original.metadata?.priority,
				}),
			sortingFn: (rowA, rowB, columnId) => {
				const pa = rowA.getValue(columnId) as number | null;
				const pb = rowB.getValue(columnId) as number | null;
				const va = pa ?? Number.POSITIVE_INFINITY;
				const vb = pb ?? Number.POSITIVE_INFINITY;
				return va - vb;
			},
			size: 88,
		},
		{
			id: "tags",
			accessorFn: (row) => sortKeyForTags(row.metadata.tags),
			header: ({ column, header }) =>
				renderComponent(DataTableColumnHeader, { column, header, title: "Tags" }),
			cell: ({ row }) =>
				renderComponent(ProjectNoteTagsCell, {
					tags: row.original.metadata?.tags ?? [],
				}),
			sortingFn: (rowA, rowB, columnId) => {
				const a = String(rowA.getValue(columnId) ?? "");
				const b = String(rowB.getValue(columnId) ?? "");
				return a.localeCompare(b, undefined, { sensitivity: "base" });
			},
			size: 260,
		},
		{
			id: "actions",
			header: "",
			cell: ({ row }) =>
				renderComponent(ProjectNoteActionsCell, {
					note: row.original,
				}),
			enableSorting: false,
			size: 56,
		},
	];
}
