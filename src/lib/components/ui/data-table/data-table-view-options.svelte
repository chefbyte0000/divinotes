<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import { Settings2 } from "@lucide/svelte";
  import type { Table } from "tanstack-table-8-svelte-5";

  let { table }: { table: Table<any> } = $props();

  const columnLabel: Record<string, string> = {
    member: "Member",
    name: "Name",
    email: "Email",
    role: "Role",
    status: "Status",
    verified: "Verified",
  };

  let hidableColumns = $derived(
    table
      .getAllColumns()
      .filter(
        (column) =>
          column.getCanHide() &&
          column.id !== "select" &&
          column.id !== "actions",
      ),
  );
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    {#snippet child({ props })}
      <Button
        {...props}
        type="button"
        variant="outline"
        size="sm"
        class="h-9 shrink-0"
      >
        <Settings2 class="mr-2 h-4 w-4" />
        View
      </Button>
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Content align="end" class="min-w-44">
    <DropdownMenu.Label>Columns</DropdownMenu.Label>
    <DropdownMenu.Separator />
    {#each hidableColumns as column (column.id)}
      <DropdownMenu.CheckboxItem
        checked={column.getIsVisible()}
        onCheckedChange={(value) => column.toggleVisibility(!!value)}
        closeOnSelect={false}
      >
        {columnLabel[column.id] ?? column.id}
      </DropdownMenu.CheckboxItem>
    {:else}
      <div class="text-muted-foreground px-2 py-1.5 text-xs">
        No toggles available.
      </div>
    {/each}
  </DropdownMenu.Content>
</DropdownMenu.Root>
