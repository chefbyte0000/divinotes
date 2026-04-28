<script lang="ts">
  import { suggestProject } from "$lib/ai/suggest-project";
  import { jsonContentToPlainText } from "$lib/tiptap/json-content-to-plain-text";
  import { parseNoteBody } from "$lib/tiptap/parse-note-body";

  let {
    noteId,
    title,
    body,
  }: {
    noteId: string;
    title: string;
    body: string | null;
  } = $props();

  let dismissed = $state(false);
  let loading = $state(false);

  let noteContent = $derived.by(() => {
    const plain = jsonContentToPlainText(parseNoteBody(body));
    const t = title.trim() || "Untitled note";
    return `${t}\n\n${plain}`;
  });

  $effect(() => {
    const key = `general-suggest-dismissed:${noteId}`;
    try {
      dismissed = sessionStorage.getItem(key) === "1";
    } catch {
      dismissed = false;
    }
  });

  function dismiss() {
    dismissed = true;
    try {
      sessionStorage.setItem(`general-suggest-dismissed:${noteId}`, "1");
    } catch {
      /* ignore */
    }
  }

  async function runSuggestion() {
    loading = true;
    try {
      await suggestProject(noteContent);
    } finally {
      loading = false;
    }
  }
</script>

{#if !dismissed}
  <div
    class="border-border bg-muted/25 text-foreground relative flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
    role="status"
  >
    <div class="min-w-0 space-y-1 pr-8 sm:pr-0">
      <p class="text-[13px] font-medium leading-snug">
        This note is in General
      </p>
      <p class="text-muted-foreground text-[12px] leading-snug">
        Auto-sort can suggest a project from what you write (local AI, coming
        soon).
      </p>
    </div>
    <div class="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
      <button
        type="button"
        class="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors disabled:opacity-60"
        disabled={loading}
        onclick={() => void runSuggestion()}
      >
        {loading ? "Working…" : "Suggest project"}
      </button>
    </div>
    <button
      type="button"
      class="text-muted-foreground hover:text-foreground absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-md transition-colors"
      aria-label="Dismiss"
      onclick={dismiss}
    >
      <span class="text-lg leading-none">×</span>
    </button>
  </div>
{/if}
