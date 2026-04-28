<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import { MoreHorizontal, Pen, Copy, Trash2 } from "@lucide/svelte";

  let { id }: { id: string } = $props();
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="ghost"
        class="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
      >
        <MoreHorizontal class="h-4 w-4" />
        <span class="sr-only">Open menu</span>
      </Button>
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Content align="end" class="w-[160px]">
    <DropdownMenu.Label>Actions</DropdownMenu.Label>
    <DropdownMenu.Separator />
    <DropdownMenu.Item onclick={() => navigator.clipboard.writeText(id)}>
      <Copy class="mr-2 h-4 w-4" /> Copy ID
    </DropdownMenu.Item>
    <DropdownMenu.Item>
      <Pen class="mr-2 h-4 w-4" /> Edit Details
    </DropdownMenu.Item>
    <DropdownMenu.Separator />
    <DropdownMenu.Item
      class="text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive"
    >
      <Trash2 class="mr-2 h-4 w-4" /> Delete User
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>
