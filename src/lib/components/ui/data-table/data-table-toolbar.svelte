<script lang="ts">
  import { Input } from "$lib/components/ui/input/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { SlidersHorizontal, X } from "@lucide/svelte";
  import type { Table } from "tanstack-table-8-svelte-5";
  import DataTableViewOptions from "./data-table-view-options.svelte";

  let {
    table,
    searchColumn = "email",
    searchColumns = [],
    filterFacets = [], // Array of { columnId: string; title: string; options: string[] }
  }: {
    table: Table<any>;
    searchColumn?: string;
    searchColumns?: string[];
    filterFacets?: { columnId: string; title: string; options: string[] }[];
  } = $props();

  let filterModalOpen = $state(false);
  let searchValue = $state("");

  const searchCols = $derived(
    searchColumns.length > 0 ? searchColumns : [searchColumn],
  );

  function handleSearch(value: string) {
    searchValue = value;
    const primary = searchCols[0];
    const column = table.getColumn(primary);
    if (column) column.setFilterValue(value || undefined);
  }

  function resetFilters() {
    table.resetColumnFilters();
    searchValue = "";
    filterModalOpen = false;
  }

  function facetFilterValue(columnId: string): string {
    const v = table.getColumn(columnId)?.getFilterValue();
    return typeof v === "string" ? v : "";
  }

  function setFacetFilter(columnId: string, raw: string) {
    table.getColumn(columnId)?.setFilterValue(raw || undefined);
  }

  const hasSearch = $derived(searchValue.trim().length > 0);

  const activeFacetChips = $derived(
    filterFacets
      .map((f) => ({
        columnId: f.columnId,
        title: f.title,
        value: facetFilterValue(f.columnId),
      }))
      .filter((c) => c.value !== ""),
  );

  const showFilterBar = $derived(hasSearch || activeFacetChips.length > 0);
</script>

<div class="flex flex-wrap items-center justify-between gap-3 py-4">
  <div class="flex min-w-0 flex-1 items-center gap-2">
    <Input
      placeholder="Search users…"
      value={searchValue}
      oninput={(e) => {
        handleSearch(e.currentTarget.value);
      }}
      class="h-9 w-full min-w-0 max-w-[min(100%,280px)] md:max-w-[320px]"
    />

    {#if showFilterBar}
      <div class="flex min-w-0 flex-wrap items-center gap-2">
        {#if hasSearch}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onclick={() => handleSearch("")}
            class="h-9 max-w-[min(100%,240px)] shrink-0 px-2 font-normal normal-case lg:px-3"
            title="Clear search"
          >
            <span class="truncate normal-case">
              <span class="text-muted-foreground">Search · </span>{searchValue.trim()}
            </span>
            <X class="ml-2 h-4 w-4 shrink-0" />
          </Button>
        {/if}
        {#each activeFacetChips as chip (chip.columnId)}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onclick={() => setFacetFilter(chip.columnId, "")}
            class="h-9 shrink-0 px-2 font-normal lg:px-3"
            title="Clear this filter"
          >
            <span>{chip.title} · {chip.value}</span>
            <X class="ml-2 h-4 w-4" />
          </Button>
        {/each}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onclick={() => resetFilters()}
          class="h-9 shrink-0 px-2 lg:px-3"
        >
          Reset
          <X class="ml-2 h-4 w-4" />
        </Button>
      </div>
    {/if}
  </div>

  <div class="relative isolate flex shrink-0 flex-wrap items-center gap-2">
    {#if filterFacets.length > 0}
      <Button
        type="button"
        variant="outline"
        size="sm"
        class="h-9 border-dashed"
        onclick={() => (filterModalOpen = true)}
        aria-expanded={filterModalOpen}
        aria-haspopup="dialog"
      >
        <SlidersHorizontal class="mr-2 h-4 w-4" />
        Filter
      </Button>
      <Dialog.Root bind:open={filterModalOpen}>
        <Dialog.Content class="sm:max-w-[425px]">
          <Dialog.Header>
            <Dialog.Title>Filter users</Dialog.Title>
            <Dialog.Description>
              Narrow the list by role or verification status. Changes apply as soon as you pick a value.
            </Dialog.Description>
          </Dialog.Header>

          <div class="grid gap-4 py-4">
            {#each filterFacets as facet (facet.columnId)}
              <div class="flex flex-col gap-2">
                <label
                  for={"filter-" + facet.columnId}
                  class="text-sm font-medium leading-none"
                >
                  {facet.title}
                </label>
                <select
                  id={"filter-" + facet.columnId}
                  class="border-input bg-background ring-offset-background focus-visible:ring-ring h-9 w-full rounded-md border px-3 py-2 text-sm shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  value={facetFilterValue(facet.columnId)}
                  onchange={(e) =>
                    setFacetFilter(facet.columnId, e.currentTarget.value)}
                >
                  <option value="">Any {facet.title}</option>
                  {#each facet.options as opt (opt)}
                    <option value={opt}>{opt}</option>
                  {/each}
                </select>
              </div>
            {/each}
          </div>

          <Dialog.Footer>
            <Button type="button" variant="ghost" onclick={resetFilters}>
              Clear filters
            </Button>
            <Button type="button" onclick={() => (filterModalOpen = false)}>
              Done
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>
    {/if}

    <DataTableViewOptions {table} />
  </div>
</div>
