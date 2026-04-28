<script lang="ts">
  import { writable } from "svelte/store";
  import {
    createSvelteTable,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    type ColumnDef,
    type SortingState,
    type ColumnFiltersState,
    type VisibilityState,
    type RowSelectionState,
    type Updater,
  } from "tanstack-table-8-svelte-5";
  import * as Table from "$lib/components/ui/table/index.js";
  import DataTableToolbar from "./data-table-toolbar.svelte";
  import DataTablePagination from "./data-table-pagination.svelte";

  type TData = any;
  type TValue = any;

  let {
    data,
    columns,
    searchColumn = "id",
    searchColumns = [],
    filterFacets = [],
  }: {
    data: TData[];
    columns: ColumnDef<TData, TValue>[];
    searchColumn?: string;
    searchColumns?: string[];
    filterFacets?: { columnId: string; title: string; options: string[] }[];
  } = $props();

  let sorting = $state<SortingState>([]);
  let columnFilters = $state<ColumnFiltersState>([]);
  let columnVisibility = $state<VisibilityState>({});
  let rowSelection = $state<RowSelectionState>({});

  function tableOptions() {
    return {
      data,
      columns,
      state: { sorting, columnFilters, columnVisibility, rowSelection },
      enableRowSelection: true,
      columnResizeMode: "onChange" as const,
      getCoreRowModel: getCoreRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getFilteredRowModel: getFilteredRowModel(),
      onSortingChange: (updater: Updater<SortingState>) => {
        sorting = typeof updater === "function" ? updater(sorting) : updater;
      },
      onColumnFiltersChange: (updater: Updater<ColumnFiltersState>) => {
        columnFilters =
          typeof updater === "function" ? updater(columnFilters) : updater;
      },
      onColumnVisibilityChange: (updater: Updater<VisibilityState>) => {
        columnVisibility =
          typeof updater === "function" ? updater(columnVisibility) : updater;
      },
      onRowSelectionChange: (updater: Updater<RowSelectionState>) => {
        rowSelection =
          typeof updater === "function" ? updater(rowSelection) : updater;
      },
    };
  }

  const tableOptionsStore = writable(tableOptions());

  $effect(() => {
    tableOptionsStore.set(tableOptions());
  });

  const table = createSvelteTable(tableOptionsStore);
</script>

<div class="w-full space-y-4">
  <DataTableToolbar
    table={$table}
    {searchColumn}
    {searchColumns}
    {filterFacets}
  />

  <div
    class="rounded-md border bg-card text-card-foreground shadow-sm overflow-hidden"
  >
    <div class="w-full overflow-x-auto">
      <Table.Root
        style="width: {$table.getTotalSize()}px; table-layout: fixed; min-width: 100%;"
      >
        <Table.Header>
          {#each $table.getHeaderGroups() as headerGroup (headerGroup.id)}
            <Table.Row>
              {#each headerGroup.headers as header (header.id)}
                <Table.Head
                  style="width: {header.getSize()}px;"
                  class="relative h-11 px-3 py-2 text-left align-middle font-medium text-muted-foreground"
                >
                  {#if !header.isPlaceholder}
                    <!-- svelte-ignore svelte_component_deprecated -->
                    <svelte:component
                      this={flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                    />
                  {/if}
                </Table.Head>
              {/each}
            </Table.Row>
          {/each}
        </Table.Header>
        <Table.Body>
          {#if $table.getRowModel().rows?.length}
            {#each $table.getRowModel().rows as row (row.id)}
              <Table.Row data-state={row.getIsSelected() && "selected"}>
                {#each row.getVisibleCells() as cell (cell.id)}
                  <Table.Cell
                    style="width: {cell.column.getSize()}px;"
                    class="p-3 align-middle truncate"
                  >
                    <!-- svelte-ignore svelte_component_deprecated -->
                    <svelte:component
                      this={flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    />
                  </Table.Cell>
                {/each}
              </Table.Row>
            {/each}
          {:else}
            <Table.Row>
              <Table.Cell colspan={columns.length} class="h-24 text-center">
                No results found.
              </Table.Cell>
            </Table.Row>
          {/if}
        </Table.Body>
      </Table.Root>
    </div>
  </div>

  <DataTablePagination table={$table} />
</div>
