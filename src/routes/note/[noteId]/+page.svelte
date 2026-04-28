<script lang="ts">
  import NoteEditor from "$lib/components/editor/note-editor.svelte";
  import NoteTitleField from "$lib/components/editor/note-title-field.svelte";
  import GeneralProjectSuggestionBanner from "$lib/components/editor/general-project-suggestion-banner.svelte";
  import Backlinks from "$lib/components/editor/backlinks.svelte";
  import { parseNoteBody } from "$lib/tiptap/parse-note-body";

  let { data } = $props();

  let saveStatus = $state<"idle" | "saving" | "saved" | "error">("idle");

  let initialDoc = $derived(parseNoteBody(data.note.body));

  let workspaceLabel = $derived(
    data.note.projectId == null ? "General" : "Project note",
  );
</script>

<svelte:head>
  <title>{data.note.title?.trim() || "Untitled note"} · Divinotes</title>
</svelte:head>

<div
  class="mx-auto flex w-full max-w-[min(96rem,calc(100vw-2rem))] flex-col gap-8 px-1 pb-16 pt-2 sm:px-2 md:gap-10"
>
  <header class="flex flex-col gap-5">
    <div class="min-w-0 flex-1 space-y-3">
      <p
        class="text-muted-foreground px-1 text-[11px] font-semibold uppercase tracking-[0.14em] opacity-90"
      >
        {workspaceLabel}
      </p>
      {#key data.note.id}
        <NoteTitleField
          noteId={data.note.id}
          initialTitle={data.note.title ?? ""}
          onSaveStatus={(s: "idle" | "saving" | "saved" | "error") => {
            saveStatus = s;
          }}
        />
      {/key}
    </div>
  </header>

  {#if data.note.projectId == null}
    <GeneralProjectSuggestionBanner
      noteId={data.note.id}
      title={data.note.title ?? ""}
      body={data.note.body}
    />
  {/if}

  {#key data.note.id}
    <NoteEditor
      noteId={data.note.id}
      projectId={data.note.projectId}
      initialDoc={initialDoc}
      syncStatus={saveStatus}
      onSaveStatus={(s) => {
        saveStatus = s;
      }}
    />
  {/key}

  <Backlinks backlinks={data.backlinks} />
</div>
