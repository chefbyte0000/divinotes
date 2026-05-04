<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { Editor, type JSONContent } from "@tiptap/core";
  import { TextSelection } from "@tiptap/pm/state";

  import EditorToolbar from "$lib/components/editor/editor-toolbar.svelte";
  import NoteEditorMoreMenu from "$lib/components/editor/note-editor-more-menu.svelte";
  import NoteSummarizeTrigger from "$lib/components/editor/note-summarize-trigger.svelte";
  import NoteOrganizeTrigger from "$lib/components/editor/note-organize-trigger.svelte";
  import { queueNoteEmbeddingSync } from "$lib/ai/note-embedding-sync";
  import { createNoteExtensions } from "$lib/tiptap/note-extensions";
  import { jsonContentToPlainText } from "$lib/tiptap/json-content-to-plain-text";
  import {
    clipboardSmartPaste,
    transformPastedHtmlSanitize,
  } from "$lib/tiptap/clipboard-smart-paste";
  import { registerNotePlainTextGetter } from "$lib/editor/note-plaintext-bus";

  let {
    noteId,
    projectId,
    initialDoc,
    noteTitle = "",
    redirectHref,
    syncStatus,
    onSaveStatus,
  }: {
    noteId: string;
    projectId: string | null;
    initialDoc: JSONContent;
    /** Shown title for local AI summarize context */
    noteTitle?: string;
    /** Where to go after Delete from the editor ⋯ menu */
    redirectHref?: string;
    syncStatus?: "idle" | "saving" | "saved" | "error";
    onSaveStatus?: (s: "idle" | "saving" | "saved" | "error") => void;
  } = $props();

  let host = $state<HTMLDivElement | null>(null);
  let editor = $state<Editor | null>(null);

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let unregisterPlain: (() => void) | null = null;

  /** Toolbar / stats react to edits */
  let docTick = $state(0);
  let summarizeOpen = $state(false);
  let summarizeLaunch = $state(0);
  let organizeOpen = $state(false);

  async function persist(doc: JSONContent) {
    onSaveStatus?.("saving");
    try {
      const r = await fetch(`/api/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: doc }),
      });
      if (!r.ok) throw new Error(String(r.status));
      queueNoteEmbeddingSync({
        noteId,
        projectId,
        plainText: jsonContentToPlainText(doc),
      });
      onSaveStatus?.("saved");
      setTimeout(() => onSaveStatus?.("idle"), 1600);
    } catch {
      onSaveStatus?.("error");
    }
  }

  onMount(() => {
    if (!host) return;

    const editorRef = { current: null as Editor | null };
    const ed = new Editor({
      element: host,
      injectCSS: false,
      extensions: createNoteExtensions({
        projectId,
        excludeNoteId: noteId,
        aiActions: {
          summarize: () => {
            summarizeLaunch += 1;
          },
          organizeNote: () => {
            organizeOpen = true;
          },
        },
      }),
      content: initialDoc,
      editorProps: {
        handlePaste(_view, event) {
          const target = editorRef.current;
          if (!target) return false;
          return clipboardSmartPaste(target, event as ClipboardEvent);
        },
        transformPastedHTML: transformPastedHtmlSanitize,
        handleClick(view, _pos, event) {
          const coords = view.posAtCoords({
            left: event.clientX,
            top: event.clientY,
          });
          if (coords == null) {
            const doc = view.state.doc;
            const sel = TextSelection.create(doc, doc.content.size);
            view.dispatch(view.state.tr.setSelection(sel));
            view.focus();
            return true;
          }
          view.focus();
          return false;
        },
        attributes: {
          class: [
            "tiptap-content cursor-text focus:outline-none",
            "min-h-[min(82vh,920px)] px-6 pb-10 pt-4 pr-28",
            "text-[15px] leading-[1.65] text-foreground",
            "selection:bg-primary/15",
            "[&_h1]:mb-3 [&_h1]:mt-6 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h1]:first:mt-0",
            "[&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight",
            "[&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-lg [&_h3]:font-semibold",
            "[&_p]:my-3 [&_p]:first:mt-0 [&_li]:my-1",
            "[&_hr]:border-border [&_hr]:my-8",
            "[&_a]:transition-colors",
          ].join(" "),
        },
      },
      onTransaction: () => {
        docTick += 1;
      },
      onUpdate: ({ editor: edRef }) => {
        docTick += 1;
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          void persist(edRef.getJSON());
        }, 850);
      },
    });

    editorRef.current = ed;
    editor = ed;
    unregisterPlain = registerNotePlainTextGetter(() => jsonContentToPlainText(ed.getJSON()));
  });

  onDestroy(() => {
    unregisterPlain?.();
    unregisterPlain = null;
    if (debounceTimer) clearTimeout(debounceTimer);
    editor?.destroy();
    editor = null;
  });

  let charCount = $derived.by(() => {
    void docTick;
    if (!editor) return { chars: 0, words: 0 };
    const cc = editor.storage.characterCount as
      | { characters: () => number; words: () => number }
      | undefined;
    return {
      chars: cc?.characters() ?? 0,
      words: cc?.words() ?? 0,
    };
  });
</script>

<div
  class="tiptap-editor-root border-border bg-card text-card-foreground shadow-xs flex flex-col overflow-hidden rounded-2xl border"
>
  {#if editor}
    <NoteSummarizeTrigger
      bind:open={summarizeOpen}
      {editor}
      hideTrigger
      launchToken={summarizeLaunch}
      {noteTitle}
    />
  {/if}
  {#if editor}
    <NoteOrganizeTrigger
      bind:open={organizeOpen}
      hideTrigger
      {editor}
      {noteTitle}
    />
  {/if}
  {#if editor}
    <div
      class="border-border bg-muted/30 flex min-w-0 items-stretch gap-0 border-b"
      role="presentation"
    >
      <div class="min-w-0 flex-1 overflow-x-auto pt-1 pl-1 md:pl-1.5">
        <EditorToolbar {editor} />
      </div>
      <div class="border-border/60 flex shrink-0 items-start gap-0 border-l pt-1 pr-1 md:pr-1.5">
        <NoteEditorMoreMenu
          {editor}
          {noteId}
          {noteTitle}
          {redirectHref}
          {summarizeOpen}
          {organizeOpen}
          onSummarize={() => {
            summarizeLaunch += 1;
          }}
          handleOrganizeNote={() => {
            organizeOpen = true;
          }}
        />
      </div>
    </div>
  {/if}

  <div class="relative min-h-0 flex-1">
    {#if syncStatus !== undefined}
      <div
        class="pointer-events-none absolute right-3 top-3 z-20"
        aria-live="polite"
      >
        <div
          class="border-border bg-muted/40 text-muted-foreground pointer-events-none flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium tracking-wide backdrop-blur-sm sm:gap-2 sm:px-3 sm:text-[11px]"
        >
          {#if syncStatus === "saving"}
            <span
              class="bg-amber-500/90 size-1.5 animate-pulse rounded-full shadow-[0_0_8px_rgba(245,158,11,0.35)]"
            ></span>
            <span>Saving…</span>
          {:else if syncStatus === "saved"}
            <span
              class="bg-primary size-1.5 rounded-full shadow-[0_0_8px_color-mix(in_oklab,var(--primary)_45%,transparent)]"
            ></span>
            <span>Saved</span>
          {:else if syncStatus === "error"}
            <span
              class="bg-destructive size-1.5 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.35)]"
            ></span>
            <span>Save failed</span>
          {:else}
            <span
              class="bg-emerald-500/90 size-1.5 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.35)]"
            ></span>
            <span class="hidden sm:inline">Synced</span>
            <span class="sm:hidden">OK</span>
          {/if}
        </div>
      </div>
    {/if}

    <div
      bind:this={host}
      class="bg-background min-h-[min(82vh,920px)] cursor-text"
    ></div>
  </div>

  {#if editor}
    <div
      class="border-border bg-muted/15 text-muted-foreground flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t px-4 py-2 text-[11px] tabular-nums"
    >
      <span class="font-medium tracking-wide uppercase opacity-90">Canvas</span>
      <span class="flex gap-4">
        <span>{charCount.words.toLocaleString()} words</span>
        <span>{charCount.chars.toLocaleString()} chars</span>
      </span>
    </div>
  {/if}
</div>
