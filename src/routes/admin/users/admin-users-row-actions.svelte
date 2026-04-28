<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { MoreHorizontal, Copy, Trash2, UserRound } from "@lucide/svelte";
  import { enhance } from "$app/forms";
  import { invalidateAll } from "$app/navigation";

  let {
    userId,
    actorUserId,
    allowImpersonate,
  }: {
    userId: string;
    actorUserId: string;
    allowImpersonate: boolean;
  } = $props();

  const isSelf = $derived(userId === actorUserId);

  let showDeleteDialog = $state(false);
  let isDeleting = $state(false);

  /** Hidden form for progressive-enhancement POST to the impersonate action */
  let impersonateForm: HTMLFormElement | undefined = $state();

  async function copyId() {
    try {
      await navigator.clipboard.writeText(userId);
    } catch {
      // Clipboard may be unavailable (permissions / non-secure context)
    }
  }
</script>

<form
  bind:this={impersonateForm}
  method="POST"
  action="?/impersonateUser"
  class="hidden"
  aria-hidden="true"
>
  <input type="hidden" name="userId" value={userId} />
</form>

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
  <DropdownMenu.Content align="end" class="w-52">
    <DropdownMenu.Label>Actions</DropdownMenu.Label>
    <DropdownMenu.Separator />
    <DropdownMenu.Item onclick={copyId}>
      <Copy class="mr-2 h-4 w-4" /> Copy user ID
    </DropdownMenu.Item>
    {#if allowImpersonate && !isSelf}
      <DropdownMenu.Item
        onSelect={(e) => {
          e.preventDefault();
          impersonateForm?.requestSubmit();
        }}
      >
        <UserRound class="mr-2 h-4 w-4" /> Impersonate user
      </DropdownMenu.Item>
    {/if}
    {#if !isSelf}
      <DropdownMenu.Separator />
      <DropdownMenu.Item
        onclick={() => {
          showDeleteDialog = true;
        }}
        class="text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive"
      >
        <Trash2 class="mr-2 h-4 w-4" /> Delete user
      </DropdownMenu.Item>
    {/if}
  </DropdownMenu.Content>
</DropdownMenu.Root>

<Dialog.Root bind:open={showDeleteDialog}>
  <Dialog.Content class="sm:max-w-[425px]" showCloseButton={!isDeleting}>
    <Dialog.Header>
      <Dialog.Title>Delete user</Dialog.Title>
      <Dialog.Description>
        This permanently removes the account from the workspace. This cannot be undone.
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer class="gap-2 sm:gap-0">
      <Button
        type="button"
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
        class="inline"
        use:enhance={() => {
          isDeleting = true;
          return async ({ result }) => {
            isDeleting = false;
            if (result.type === "success") {
              showDeleteDialog = false;
              await invalidateAll();
            }
          };
        }}
      >
        <input type="hidden" name="userId" value={userId} />
        <Button variant="destructive" type="submit" disabled={isDeleting}>
          {isDeleting ? "Deleting..." : "Delete"}
        </Button>
      </form>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
