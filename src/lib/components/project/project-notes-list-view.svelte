<script lang="ts">
  import { writable } from "svelte/store";
  import {
    createSvelteTable,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    type ColumnFiltersState,
    type SortingState,
    type Updater,
  } from "tanstack-table-8-svelte-5";
  import * as Table from "$lib/components/ui/table/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { ChevronLeft, ChevronRight } from "@lucide/svelte";
  import type { ProjectNoteRow } from "$lib/types/project-notes";
  import { createProjectNotesColumns } from "./project-notes-columns";

  let { notes }: { notes: ProjectNoteRow[] } = $props();

  const columns = createProjectNotesColumns();

  let sorting = $state<SortingState>([{ id: "updatedAt", desc: true }]);
  let columnFilters = $state<ColumnFiltersState>([]);

  let searchValue = $state("");

  function tableOptions() {
    return {
      data: notes,
      columns,
      state: { sorting, columnFilters },
      enableRowSelection: false,
      getCoreRowModel: getCoreRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getFilteredRowModel: getFilteredRowModel(),
      initialState: {
        pagination: { pageSize: 15 },
      },
      onSortingChange: (updater: Updater<SortingState>) => {
        sorting = typeof updater === "function" ? updater(sorting) : updater;
      },
      onColumnFiltersChange: (updater: Updater<ColumnFiltersState>) => {
        columnFilters =
          typeof updater === "function" ? updater(columnFilters) : updater;
      },
    };
  }

  const tableOptionsStore = writable(tableOptions());

  $effect(() => {
    tableOptionsStore.set(tableOptions());
  });

  const table = createSvelteTable(tableOptionsStore);

  function handleSearch(value: string) {
    searchValue = value;
    const column = $table.getColumn("title");
    column?.setFilterValue(value || undefined);
  }
</script>

<div class="w-full space-y-4">
  <Input
    placeholder="Search notes…"
    value={searchValue}
    class="h-9 max-w-[min(100%,320px)]"
    oninput={(e) => handleSearch(e.currentTarget.value)}
    aria-label="Search notes"
  />

  <div
    class="border-border bg-card text-card-foreground overflow-hidden rounded-xl border shadow-xs"
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
                  class="text-muted-foreground relative h-11 px-3 py-2 text-left align-middle font-medium"
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
              <Table.Row>
                {#each row.getVisibleCells() as cell (cell.id)}
                  <Table.Cell
                    style="width: {cell.column.getSize()}px;"
                    class="p-3 align-middle"
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
              <Table.Cell colspan={columns.length} class="text-muted-foreground h-24 text-center">
                No notes match your search.
              </Table.Cell>
            </Table.Row>
          {/if}
        </Table.Body>
      </Table.Root>
    </div>
  </div>

  <div class="flex flex-wrap items-center justify-between gap-3 px-1">
    <p class="text-muted-foreground text-sm tabular-nums">
      {$table.getFilteredRowModel().rows.length}
      {$table.getFilteredRowModel().rows.length === 1 ? "note" : "notes"}
    </p>
    <div class="flex items-center gap-2">
      <label class="text-muted-foreground flex items-center gap-2 text-sm">
        <span class="hidden sm:inline">Rows per page</span>
        <select
          class="border-input bg-background ring-offset-background h-8 rounded-md border px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={$table.getState().pagination.pageSize}
          onchange={(e) => $table.setPageSize(Number(e.currentTarget.value))}
        >
          {#each [10, 15, 20, 30] as pageSize (pageSize)}
            <option value={pageSize}>{pageSize}</option>
          {/each}
        </select>
      </label>
      <span class="text-muted-foreground text-sm tabular-nums">
        Page {$table.getState().pagination.pageIndex + 1} of {$table.getPageCount() || 1}
      </span>
      <Button
        variant="outline"
        size="icon-sm"
        onclick={() => $table.previousPage()}
        disabled={!$table.getCanPreviousPage()}
        aria-label="Previous page"
      >
        <ChevronLeft class="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon-sm"
        onclick={() => $table.nextPage()}
        disabled={!$table.getCanNextPage()}
        aria-label="Next page"
      >
        <ChevronRight class="h-4 w-4" />
      </Button>
    </div>
  </div>
</div>
