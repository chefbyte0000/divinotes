<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import NoteEditor from "$lib/components/editor/note-editor.svelte";
  import NoteTitleField from "$lib/components/editor/note-title-field.svelte";
  import NoteDescriptionField from "$lib/components/editor/note-description-field.svelte";
  import NoteTagsField from "$lib/components/editor/note-tags-field.svelte";
  import { currentNotePlainText } from "$lib/editor/note-plaintext-bus";
  import GeneralProjectSuggestionBanner from "$lib/components/editor/general-project-suggestion-banner.svelte";
  import NudgeBanner from "$lib/components/nudge/NudgeBanner.svelte";
  import Backlinks from "$lib/components/editor/backlinks.svelte";
  import { NudgeController, type NudgeOffer } from "$lib/nudge/NudgeController";
  import { parseNoteBody } from "$lib/tiptap/parse-note-body";

  let { data } = $props();

  let saveStatus = $state<"idle" | "saving" | "saved" | "error">("idle");

  let initialDoc = $derived(parseNoteBody(data.note.body));

  let workspaceLabel = $derived(
    data.note.projectId == null ? "General" : "Project note",
  );

  let afterDeleteHref = $derived(
    data.note.projectId == null ? "/" : `/project/${data.note.projectId}`,
  );

  let nudgeOffer = $state<NudgeOffer | null>(null);

  $effect(() => {
    void page.url.pathname;
    void data.note.id;
    void data.note.projectId;
    const ctrl = new NudgeController(() => data.note.projectId ?? null);
    return ctrl.observe((next) => {
      if (!next) {
        nudgeOffer = null;
        return;
      }
      try {
        if (sessionStorage.getItem(`nudge-dismiss:${next.id}`) === "1") {
          nudgeOffer = null;
          return;
        }
      } catch {
        /* ignore */
      }
      nudgeOffer = next;
    });
  });

  function dismissNudge() {
    const n = nudgeOffer;
    if (n) {
      try {
        sessionStorage.setItem(`nudge-dismiss:${n.id}`, "1");
      } catch {
        /* ignore */
      }
    }
    nudgeOffer = null;
  }
</script>

<svelte:head>
  <title>{data.note.title?.trim() || "Untitled note"} · Divinotes</title>
</svelte:head>

<div
  class="mx-auto flex w-full max-w-[min(96rem,calc(100vw-2rem))] flex-col gap-8 px-1 pb-16 pt-2 sm:px-2 md:gap-10"
>
  <header class="flex flex-col gap-5">
    <div class="flex w-full flex-wrap items-start justify-between gap-3">
      <div class="min-w-0 flex-1 space-y-3">
        <p
          class="text-muted-foreground px-1 text-[11px] font-semibold uppercase tracking-[0.14em] opacity-90"
        >
          {workspaceLabel}
        </p>
        {#key data.note.id}
          <div class="space-y-1">
            <NoteTitleField
              noteId={data.note.id}
              initialTitle={data.note.title ?? ""}
              getPlainText={currentNotePlainText}
              onSaveStatus={(s: "idle" | "saving" | "saved" | "error") => {
                saveStatus = s;
              }}
            />
            <NoteDescriptionField
              noteId={data.note.id}
              noteTitle={data.note.title ?? ""}
              initialDescription={data.note.description ?? ""}
              getPlainText={currentNotePlainText}
              onSaveStatus={(s: "idle" | "saving" | "saved" | "error") => {
                saveStatus = s;
              }}
            />
            <NoteTagsField
              noteId={data.note.id}
              noteTitle={data.note.title ?? ""}
              initialTags={data.note.metadata?.tags ?? []}
              getPlainText={currentNotePlainText}
              onSaveStatus={(s: "idle" | "saving" | "saved" | "error") => {
                saveStatus = s;
              }}
            />
          </div>
        {/key}
      </div>
    </div>
  </header>

  {#if data.note.projectId == null}
    <GeneralProjectSuggestionBanner
      noteId={data.note.id}
      title={data.note.title ?? ""}
      body={data.note.body}
    />
  {/if}

  <NudgeBanner
    variant="inline"
    offer={nudgeOffer}
    onDismiss={dismissNudge}
    onPrimary={() => goto("/projects")}
  />

  {#key data.note.id}
    <NoteEditor
      noteId={data.note.id}
      projectId={data.note.projectId}
      initialDoc={initialDoc}
      noteTitle={data.note.title ?? ""}
      redirectHref={afterDeleteHref}
      syncStatus={saveStatus}
      onSaveStatus={(s) => {
        saveStatus = s;
      }}
    />
  {/key}

  <Backlinks backlinks={data.backlinks} />
</div>
