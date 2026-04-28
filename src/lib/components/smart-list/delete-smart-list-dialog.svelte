<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Button, buttonVariants } from "$lib/components/ui/button/index.js";
  import { goto, invalidateAll } from "$app/navigation";
  import { cn } from "$lib/utils.js";
  import { Trash2 } from "@lucide/svelte";

  let {
    listId,
    listTitle = "",
    redirectHref,
    variant = "button",
  }: {
    listId: string;
    listTitle?: string;
    redirectHref: string;
    variant?: "button" | "icon";
  } = $props();

  let open = $state(false);
  let deleting = $state(false);

  let label = $derived(listTitle?.trim() ? listTitle.trim() : "Untitled list");

  async function confirmDelete() {
    deleting = true;
    try {
      const r = await fetch(`/api/smart-lists/${listId}`, { method: "DELETE" });
      if (!r.ok) throw new Error(String(r.status));
      open = false;
      await goto(redirectHref);
      await invalidateAll();
    } catch {
      await invalidateAll();
    } finally {
      deleting = false;
    }
  }
</script>

<Dialog.Root bind:open>
  {#if variant === "icon"}
    <Dialog.Trigger
      class={cn(
        buttonVariants({ variant: "ghost", size: "icon-sm" }),
        "text-muted-foreground hover:text-destructive shrink-0",
      )}
      aria-label="Delete list"
    >
      <Trash2 class="size-4" />
    </Dialog.Trigger>
  {:else}
    <Dialog.Trigger
      class={cn(buttonVariants({ variant: "outline", size: "sm" }), "border-destructive/40 text-destructive hover:bg-destructive/10")}
    >
      Delete list
    </Dialog.Trigger>
  {/if}

  <Dialog.Content class="sm:max-w-md" showCloseButton={!deleting}>
    <Dialog.Header>
      <Dialog.Title>Delete this list?</Dialog.Title>
      <Dialog.Description class="space-y-2">
        <span class="block">
          <span class="text-foreground font-medium">“{label}”</span>
          will be permanently removed. This cannot be undone.
        </span>
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer class="gap-2 sm:justify-end">
      <Button type="button" variant="outline" onclick={() => (open = false)} disabled={deleting}>
        Cancel
      </Button>
      <Button type="button" variant="destructive" disabled={deleting} onclick={() => void confirmDelete()}>
        {deleting ? "Deleting…" : "Delete forever"}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
