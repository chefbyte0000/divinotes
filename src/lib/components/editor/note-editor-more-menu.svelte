<script lang="ts">
  import type { Editor } from "@tiptap/core";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import DeleteNoteDialog from "$lib/components/editor/delete-note-dialog.svelte";
  import { Layers, MoreHorizontal, Sparkles, Trash2 } from "@lucide/svelte";

  let {
    editor,
    noteId,
    noteTitle = "",
    redirectHref,
    onSummarize = () => {},
    handleOrganizeNote = () => {},
    summarizeOpen = false,
    organizeOpen = false,
  }: {
    editor: Editor;
    noteId: string;
    noteTitle?: string;
    redirectHref?: string;
    onSummarize?: () => void;
    handleOrganizeNote?: () => void;
    summarizeOpen?: boolean;
    organizeOpen?: boolean;
  } = $props();

  let menuOpen = $state(false);
  let deleteOpen = $state(false);
</script>

<div class="flex shrink-0 items-start pt-0.5">
  <DropdownMenu.Root bind:open={menuOpen}>
    <DropdownMenu.Trigger>
      {#snippet child({ props })}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          class="text-muted-foreground hover:text-foreground size-8"
          title="Note actions"
          {...props}
        >
          <MoreHorizontal class="size-4" />
        </Button>
      {/snippet}
    </DropdownMenu.Trigger>
    <DropdownMenu.Content align="end" class="min-w-[13rem]">
      <DropdownMenu.Label
        class="text-muted-foreground px-2 py-1 text-[10px] font-semibold uppercase tracking-wide"
      >
        Local AI
      </DropdownMenu.Label>
      <DropdownMenu.Item
        class="gap-2"
        disabled={summarizeOpen}
        onclick={() => {
          menuOpen = false;
          onSummarize();
        }}
      >
        <Sparkles class="size-4 shrink-0" />
        Summarize note…
      </DropdownMenu.Item>
      <DropdownMenu.Item
        class="gap-2"
        disabled={organizeOpen}
        onclick={() => {
          menuOpen = false;
          handleOrganizeNote();
        }}
      >
        <Layers class="size-4 shrink-0" />
        Organize note…
      </DropdownMenu.Item>

      <DropdownMenu.Separator />

      <DropdownMenu.Label
        class="text-muted-foreground px-2 py-1 text-[10px] font-semibold uppercase tracking-wide"
      >
        This note
      </DropdownMenu.Label>
      <DropdownMenu.Item class="text-destructive focus:bg-destructive/10 gap-2" onclick={() => (deleteOpen = true)}>
        <Trash2 class="size-4 shrink-0" />
        Delete note…
      </DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu.Root>

  <DeleteNoteDialog bind:open={deleteOpen} hideTrigger {noteId} {noteTitle} {redirectHref} variant="icon" />
</div>
