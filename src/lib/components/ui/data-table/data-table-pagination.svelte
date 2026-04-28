<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { ChevronLeft, ChevronRight } from "@lucide/svelte";
  import type { Table } from "tanstack-table-8-svelte-5";

  let { table }: { table: Table<any> } = $props();
</script>

<div class="flex items-center justify-between px-2 py-4">
  <div class="flex-1 text-sm text-muted-foreground">
    {table.getFilteredSelectedRowModel().rows.length} of
    {table.getFilteredRowModel().rows.length} row(s) selected.
  </div>
  <div class="flex items-center space-x-6 lg:space-x-8">
    <div class="flex items-center space-x-2">
      <p class="hidden text-sm font-medium sm:block">Rows per page</p>
      <select
        class="h-8 w-17.5 rounded-md border border-input bg-transparent px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-ring"
        value={table.getState().pagination.pageSize}
        onchange={(e) => table.setPageSize(Number(e.currentTarget.value))}
      >
        {#each [10, 20, 30, 40, 50] as pageSize}
          <option value={pageSize}>{pageSize}</option>
        {/each}
      </select>
    </div>
    <div class="flex w-25 items-center justify-center text-sm font-medium">
      Page {table.getState().pagination.pageIndex + 1} of
      {table.getPageCount()}
    </div>
    <div class="flex items-center space-x-2">
      <Button
        variant="outline"
        size="icon-sm"
        onclick={() => table.previousPage()}
        disabled={!table.getCanPreviousPage()}
      >
        <span class="sr-only">Go to previous page</span>
        <ChevronLeft class="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon-sm"
        onclick={() => table.nextPage()}
        disabled={!table.getCanNextPage()}
      >
        <span class="sr-only">Go to next page</span>
        <ChevronRight class="h-4 w-4" />
      </Button>
    </div>
  </div>
</div>
