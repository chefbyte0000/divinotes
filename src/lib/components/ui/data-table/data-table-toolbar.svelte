<script lang="ts">
  import { Input } from "$lib/components/ui/input/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Combobox } from "$lib/components/ui/combobox/index.js";
  import { SlidersHorizontal, X } from "@lucide/svelte";
  import type { Table } from "tanstack-table-8-svelte-5";
  import DataTableViewOptions from "./data-table-view-options.svelte";

  let {
    table,
    searchColumn = "email",
    searchColumns = [],
    filterFacets = [], // Array of { columnId: string, title: string, options: string[] }
  }: {
    table: Table<any>;
    searchColumn?: string;
    searchColumns?: string[];
    filterFacets?: { columnId: string; title: string; options: string[] }[];
  } = $props();

  let filterModalOpen = $state(false);
  let searchValue = $state("");

  // If searchColumns is provided, use it. Otherwise fall back to searchColumn for backward compatibility
  const searchCols = searchColumns.length > 0 ? searchColumns : [searchColumn];

  function handleSearch(value: string) {
    searchValue = value;

    // Apply search to all specified columns
    searchCols.forEach((colId) => {
      const column = table.getColumn(colId);
      if (column) {
        column.setFilterValue(value || undefined);
      }
    });
  }

  function resetFilters() {
    table.resetColumnFilters();
    searchValue = "";
    filterModalOpen = false;
  }
</script>

<div class="flex flex-wrap items-center justify-between gap-3 py-4">
  <!-- Search Bar (Top Left) -->
  <div class="flex flex-1 items-center space-x-2">
    <Input
      placeholder="Search users..."
      value={searchValue}
      oninput={(e) => {
        handleSearch(e.currentTarget.value);
      }}
      class="h-8 w-[150px] lg:w-[250px]"
    />

    {#if table.getState().columnFilters.length > 0}
      <Button
        variant="ghost"
        size="sm"
        onclick={() => resetFilters()}
        class="h-8 px-2 lg:px-3"
      >
        Reset
        <X class="ml-2 h-4 w-4" />
      </Button>
    {/if}
  </div>

  <!-- Actions (Top Right) -->
  <div class="flex items-center space-x-2">
    <!-- Filter Modal Button -->
    {#if filterFacets.length > 0}
      <Dialog.Root bind:open={filterModalOpen}>
        <Dialog.Trigger>
          {#snippet child({ props })}
            <Button
              {...props}
              variant="outline"
              size="sm"
              class="h-8 border-dashed"
            >
              <SlidersHorizontal class="mr-2 h-4 w-4" />
              Filter
            </Button>
          {/snippet}
        </Dialog.Trigger>
        <Dialog.Content class="sm:max-w-[425px]">
          <Dialog.Header>
            <Dialog.Title>Filter Data</Dialog.Title>
            <Dialog.Description>
              Select criteria to filter the table.
            </Dialog.Description>
          </Dialog.Header>

          <div class="grid gap-4 py-4">
            {#each filterFacets as facet}
              <div class="flex flex-col gap-2">
                <label
                  for={facet.columnId}
                  class="text-sm font-medium leading-none"
                >
                  {facet.title}
                </label>
                <Combobox
                  value={(table
                    .getColumn(facet.columnId)
                    ?.getFilterValue() as string) ?? ""}
                  options={facet.options}
                  placeholder="Select {facet.title}..."
                  onSelect={(selectedValue) =>
                    table
                      .getColumn(facet.columnId)
                      ?.setFilterValue(selectedValue || undefined)}
                />
              </div>
            {/each}
          </div>

          <Dialog.Footer>
            <Button variant="ghost" onclick={resetFilters}>Clear</Button>
            <Button type="submit" onclick={() => (filterModalOpen = false)}
              >Apply</Button
            >
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>
    {/if}

    <!-- Column Visibility -->
    <DataTableViewOptions {table} />
  </div>
</div>
