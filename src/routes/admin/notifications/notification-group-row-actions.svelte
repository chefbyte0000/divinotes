<script lang="ts">
  import { enhance } from "$app/forms";
  import { invalidateAll } from "$app/navigation";
  import { Button } from "$lib/components/ui/button/index.js";
  import { MoreHorizontal, Pencil, Trash2 } from "@lucide/svelte";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import type { AdminGroupRow } from "./group-columns";

  let { group }: { group: AdminGroupRow } = $props();

  let editOpen = $state(false);
  let deleteOpen = $state(false);
  let name = $state("");
  let memberText = $state("");
  let busy = $state(false);

  function openEdit() {
    name = group.name;
    memberText = group.memberUserIds.join("\n");
    editOpen = true;
  }
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    {#snippet child({ props })}
      <Button {...props} variant="ghost" class="flex h-8 w-8 p-0 data-[state=open]:bg-muted" aria-label="Group actions">
        <MoreHorizontal class="h-4 w-4" />
      </Button>
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Content align="end" class="w-44">
    <DropdownMenu.Item onclick={openEdit}>
      <Pencil class="mr-2 h-4 w-4" /> Edit
    </DropdownMenu.Item>
    <DropdownMenu.Item
      onclick={() => {
        deleteOpen = true;
      }}
      class="text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive"
    >
      <Trash2 class="mr-2 h-4 w-4" /> Delete
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>

<Dialog.Root bind:open={editOpen}>
  <Dialog.Content class="sm:max-w-md" showCloseButton={!busy}>
    <Dialog.Header>
      <Dialog.Title>Edit group</Dialog.Title>
      <Dialog.Description>Update the display name and member user ids.</Dialog.Description>
    </Dialog.Header>
    <form
      method="POST"
      action="?/updateGroup"
      class="space-y-4"
      use:enhance={() => {
        busy = true;
        return async ({ result, update }) => {
          busy = false;
          if (result.type === "success") {
            editOpen = false;
            await invalidateAll();
          } else {
            await update();
          }
        };
      }}
    >
      <input type="hidden" name="groupId" value={group.id} />
      <div class="space-y-2">
        <label for="g-name-{group.id}" class="text-sm font-medium">Name</label>
        <Input id="g-name-{group.id}" name="name" bind:value={name} required />
      </div>
      <div class="space-y-2">
        <label for="g-members-{group.id}" class="text-sm font-medium"
          >Member user ids (one per line or comma-separated)</label
        >
        <textarea
          id="g-members-{group.id}"
          name="memberUserIdsText"
          bind:value={memberText}
          required
          rows="5"
          class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[120px] w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        ></textarea>
      </div>
      <Dialog.Footer class="gap-2 sm:gap-0">
        <Button type="button" variant="outline" onclick={() => (editOpen = false)} disabled={busy}>Cancel</Button>
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={deleteOpen}>
  <Dialog.Content class="sm:max-w-sm" showCloseButton={!busy}>
    <Dialog.Header>
      <Dialog.Title>Delete group</Dialog.Title>
      <Dialog.Description>
        Remove “{group.name}”. Campaigns referencing this group id will need to be edited manually.
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer class="gap-2 sm:gap-0">
      <Button type="button" variant="outline" onclick={() => (deleteOpen = false)} disabled={busy}>Cancel</Button>
      <form
        method="POST"
        action="?/deleteGroup"
        use:enhance={() => {
          busy = true;
          return async ({ result, update }) => {
            busy = false;
            if (result.type === "success") {
              deleteOpen = false;
              await invalidateAll();
            } else {
              await update();
            }
          };
        }}
      >
        <input type="hidden" name="groupId" value={group.id} />
        <Button variant="destructive" type="submit" disabled={busy}>{busy ? "Deleting…" : "Delete"}</Button>
      </form>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
