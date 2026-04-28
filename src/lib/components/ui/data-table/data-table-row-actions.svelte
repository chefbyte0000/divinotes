<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import * as AlertDialog from "$lib/components/ui/dialog/index.js";
  import { MoreHorizontal, Copy, Trash2 } from "@lucide/svelte";
  import { enhance } from "$app/forms";

  let { id }: { id: string } = $props();

  let showDeleteDialog = $state(false);
  let isDeleting = $state(false);
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
    <DropdownMenu.Item
      onclick={() => {
        navigator.clipboard.writeText(id);
      }}
    >
      <Copy class="mr-2 h-4 w-4" /> Copy ID
    </DropdownMenu.Item>
    <DropdownMenu.Separator />
    <DropdownMenu.Item
      onclick={() => {
        showDeleteDialog = true;
      }}
      class="text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive"
    >
      <Trash2 class="mr-2 h-4 w-4" /> Delete User
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>

<!-- Delete Confirmation Dialog -->
<AlertDialog.Root bind:open={showDeleteDialog}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Delete User</AlertDialog.Title>
      <AlertDialog.Description>
        Are you sure you want to delete this user? This action cannot be undone.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <Button
        variant="outline"
        onclick={() => {
          showDeleteDialog = false;
        }}
        disabled={isDeleting}
      >
        Cancel
      </Button>
      <form
        method="POST"
        action="?/deleteUser"
        class="contents"
        use:enhance={() => {
          isDeleting = true;
          return async ({ result }) => {
            isDeleting = false;
            if (result.type === "success") {
              showDeleteDialog = false;
            }
          };
        }}
      >
        <input type="hidden" name="userId" value={id} />
        <Button variant="destructive" type="submit" disabled={isDeleting}>
          {isDeleting ? "Deleting..." : "Delete"}
        </Button>
      </form>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
