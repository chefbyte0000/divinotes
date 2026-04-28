<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import { Settings2 } from "@lucide/svelte";
  import type { Table } from "tanstack-table-8-svelte-5";

  let { table }: { table: Table<any> } = $props();

  let hidableColumns = $derived(
    table
      .getAllColumns()
      .filter(
        (column) =>
          typeof column.accessorFn !== "undefined" && column.getCanHide(),
      ),
  );
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="outline"
        size="sm"
        class="ml-auto hidden h-8 lg:flex"
      >
        <Settings2 class="mr-2 h-4 w-4" />
        View
      </Button>
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Content align="end" class="w-37.5">
    <DropdownMenu.Label>Toggle columns</DropdownMenu.Label>
    <DropdownMenu.Separator />
    {#each hidableColumns as column (column.id)}
      <DropdownMenu.CheckboxItem
        checked={column.getIsVisible()}
        onCheckedChange={(value) => column.toggleVisibility(!!value)}
      >
        <span class="capitalize">{column.id}</span>
      </DropdownMenu.CheckboxItem>
    {/each}
  </DropdownMenu.Content>
</DropdownMenu.Root>
