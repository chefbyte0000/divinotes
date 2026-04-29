<script lang="ts">
  import type { Editor } from "@tiptap/core";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import DeleteNoteDialog from "$lib/components/editor/delete-note-dialog.svelte";
  import NoteSummarizeTrigger from "$lib/components/editor/note-summarize-trigger.svelte";
  import ProjectAiOrganizeDialog from "$lib/components/project/project-ai-organize-dialog.svelte";
  import type { ProjectNoteRow } from "$lib/types/project-notes";
  import { Layers, MoreHorizontal, Sparkles, Trash2 } from "@lucide/svelte";

  let {
    editor,
    noteId,
    noteTitle = "",
    redirectHref,
    projectOrganize = null,
  }: {
    editor: Editor;
    noteId: string;
    noteTitle?: string;
    redirectHref?: string;
    projectOrganize?: {
      projectId: string;
      projectName: string;
      notes: ProjectNoteRow[];
    } | null;
  } = $props();

  let menuOpen = $state(false);
  let deleteOpen = $state(false);
  let summarizeOpen = $state(false);
  let summarizeLaunch = $state(0);
  let organizeOpen = $state(false);

  const canOrganizeProject = $derived(
    projectOrganize != null && projectOrganize.notes.length > 0,
  );
</script>

<div class="flex shrink-0 items-start pt-0.5">
  <NoteSummarizeTrigger
    bind:open={summarizeOpen}
    {editor}
    hideTrigger
    launchToken={summarizeLaunch}
    {noteTitle}
  />

  {#if projectOrganize}
    <ProjectAiOrganizeDialog
      bind:open={organizeOpen}
      hideTrigger
      projectId={projectOrganize.projectId}
      projectName={projectOrganize.projectName}
      notes={projectOrganize.notes}
    />
  {/if}

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
          summarizeLaunch += 1;
        }}
      >
        <Sparkles class="size-4 shrink-0" />
        Summarize note…
      </DropdownMenu.Item>
      <DropdownMenu.Item
        class="gap-2"
        disabled={!projectOrganize || !canOrganizeProject || organizeOpen}
        title={projectOrganize == null ?
          "Only available when this note belongs to a project"
        : !canOrganizeProject ?
          "Add at least one note to the project to run organize"
        : undefined}
        onclick={() => {
          if (!projectOrganize || !canOrganizeProject) return;
          menuOpen = false;
          organizeOpen = true;
        }}
      >
        <Layers class="size-4 shrink-0" />
        Organize project…
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
