<script lang="ts">
  import { tick } from "svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { FileText, MoreHorizontal, Pencil, Trash2 } from "@lucide/svelte";
  import type { WorkspaceNoteSummary } from "$lib/types/workspace-notes";
  import { cn } from "$lib/utils.js";

  const actionTriggerClass =
    "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 focus:bg-sidebar-accent/60 data-[state=open]:bg-sidebar-accent/70 size-7 shrink-0 rounded-md transition-colors";

  let {
    note,
    pathname,
    editing,
    draft,
    onDraftInput,
    saving,
    nested = false,
    onNoteActivate,
    onBlurCommit,
    onCommit,
    onCancelEdit,
    onDelete,
    onRenameRequest,
  }: {
    note: WorkspaceNoteSummary;
    pathname: string;
    editing: boolean;
    draft: string;
    onDraftInput: (value: string) => void;
    saving: boolean;
    nested?: boolean;
    onNoteActivate: (e: MouseEvent, noteId: string) => void;
    onBlurCommit: () => void | Promise<void>;
    onCommit: () => void | Promise<void>;
    onCancelEdit: () => void;
    onDelete: () => void;
    onRenameRequest: () => void;
  } = $props();

  let inputRef: HTMLInputElement | null = $state(null);

  $effect(() => {
    if (editing) {
      void tick().then(() => {
        inputRef?.focus();
        inputRef?.select();
      });
    }
  });

  function handleTitleBlur() {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        void onBlurCommit();
      });
    });
  }

  const isActive = $derived(pathname === `/note/${note.id}`);
  const displayTitle = $derived(note.title?.trim() ? note.title : "Untitled");

  function onInputKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      void onCommit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancelEdit();
    }
  }
</script>

<li class="group/note flex min-h-9 items-center gap-0.5">
  {#if editing}
    <div
      class={cn(
        "border-sidebar-border/80 flex min-w-0 flex-1 items-center gap-2 rounded-lg border bg-sidebar px-2 py-1",
        nested ? "pl-2 pr-1" : "px-2",
      )}
    >
      <FileText class="size-[14px] shrink-0 opacity-60" aria-hidden="true" />
      <Input
        bind:ref={inputRef}
        id={`sidebar-note-title-${note.id}`}
        type="text"
        class="h-7 min-w-0 flex-1 border-0 bg-transparent px-0 py-0 text-[13px] shadow-none focus-visible:ring-0"
        value={draft}
        oninput={(e) => onDraftInput(e.currentTarget.value)}
        disabled={saving}
        maxlength={500}
        aria-label="Note title"
        onkeydown={onInputKeydown}
        onblur={handleTitleBlur}
      />
    </div>
  {:else}
    <a
      href="/note/{note.id}"
      data-sveltekit-preload-data="hover"
      title="Open note — double-click to rename"
      onclick={(e) => onNoteActivate(e, note.id)}
      class={cn(
        "flex min-w-0 flex-1 items-center gap-2 rounded-lg text-[13px] leading-none transition-colors",
        nested ? "py-1.5 pl-2 pr-1.5" : "px-2.5 py-1.5",
        isActive
          ? "bg-sidebar-accent/90 text-sidebar-accent-foreground font-medium ring-1 ring-sidebar-ring/50"
          : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
      )}
    >
      <FileText class="size-[14px] shrink-0 opacity-60" aria-hidden="true" />
      <span class="min-w-0 flex-1 truncate">{displayTitle}</span>
    </a>
  {/if}
  {#if !editing}
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            class={`${actionTriggerClass} opacity-0 group-hover/note:opacity-100 focus:opacity-100 data-[state=open]:opacity-100`}
            aria-label="Note actions"
            title="Note actions"
            {...props}
          >
            <MoreHorizontal class="size-4" />
          </Button>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end">
        <DropdownMenu.Item class="gap-2" onclick={() => onRenameRequest()}>
          <Pencil class="size-4" />
          Rename
        </DropdownMenu.Item>
        <DropdownMenu.Item variant="destructive" class="gap-2" onclick={() => onDelete()}>
          <Trash2 class="size-4" />
          Delete
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  {/if}
</li>
