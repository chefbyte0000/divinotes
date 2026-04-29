<script lang="ts">
  import type { Editor } from "@tiptap/core";
  import type { InitProgressReport } from "@mlc-ai/web-llm";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import {
    NOTE_SUMMARIZER_PERSONA_SLUG,
    fetchActivePersonaBySlug,
    summarizeNoteWithPersona,
  } from "$lib/ai/note-summarize";
  import { jsonContentToPlainText } from "$lib/tiptap/json-content-to-plain-text";
  import { detectWebGpu } from "$lib/ai/webgpu-detector";
  import { markdownToSafeHtml } from "$lib/tiptap/markdown-paste";
  import { toast } from "$lib/toasts/toast";
  import { Sparkles, LoaderCircle, Copy, CornerDownLeft } from "@lucide/svelte";

  let {
    editor,
    noteTitle = "",
  }: {
    editor: Editor;
    noteTitle?: string;
  } = $props();

  let open = $state(false);
  let phase = $state<
    "idle" | "gpu" | "persona" | "model" | "stream" | "done" | "error"
  >("idle");
  let errorMessage = $state<string | null>(null);
  let modelHint = $state("");
  let summary = $state("");
  let abort: AbortController | null = null;

  function reset() {
    phase = "idle";
    errorMessage = null;
    modelHint = "";
    summary = "";
    abort?.abort();
    abort = null;
  }

  $effect(() => {
    if (!open) {
      abort?.abort();
      reset();
    }
  });

  function summaryToEditorHtml(text: string): string {
    const body = markdownToSafeHtml(text.trim());
    return `<h2>AI summary</h2>${body}`;
  }

  async function run() {
    abort?.abort();
    errorMessage = null;
    summary = "";
    modelHint = "";
    abort = new AbortController();
    const signal = abort.signal;
    phase = "gpu";
    open = true;

    const gpu = await detectWebGpu();
    if (!gpu.ok) {
      phase = "error";
      errorMessage = `${gpu.title}: ${gpu.description}`;
      return;
    }

    phase = "persona";
    let persona;
    try {
      persona = await fetchActivePersonaBySlug(NOTE_SUMMARIZER_PERSONA_SLUG);
    } catch (e) {
      phase = "error";
      errorMessage = e instanceof Error ? e.message : "Could not load persona.";
      return;
    }
    if (!persona) {
      phase = "error";
      errorMessage =
        "The note-summarizer persona is not available. An admin can add it under Admin → AI personas (use “Install starter personas” or create slug note-summarizer).";
      return;
    }

    const plain = jsonContentToPlainText(editor.getJSON());
    if (!plain.trim()) {
      phase = "error";
      errorMessage =
        "This note has no text to summarize yet. Add some content, save, and try again.";
      return;
    }

    phase = "model";
    modelHint = "Preparing on-device model…";

    const onModelProgress = (r: InitProgressReport) => {
      const t = typeof (r as { text?: unknown }).text === "string" ? (r as { text: string }).text : "";
      if (t) modelHint = t;
    };

    phase = "stream";
    modelHint = "";

    try {
      summary = await summarizeNoteWithPersona({
        persona,
        noteTitle,
        plainText: plain,
        signal,
        onModelProgress,
        onToken: (_d, full) => {
          summary = full;
        },
      });
      phase = "done";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        phase = "idle";
        return;
      }
      phase = "error";
      errorMessage = e instanceof Error ? e.message : String(e);
    }
  }

  async function copySummary() {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary);
      toast("Summary copied to clipboard.", { variant: "success" });
    } catch {
      toast("Could not copy to clipboard.", { variant: "destructive" });
    }
  }

  function insertBelowCursor() {
    if (!summary) return;
    editor.chain().focus().insertContent(summaryToEditorHtml(summary)).run();
    open = false;
  }
</script>

<span class="contents inline-flex">
  <Button
    type="button"
    variant="ghost"
    size="icon-sm"
    class="size-8 shrink-0"
    title="Summarize note (local AI)"
    disabled={open}
    onclick={() => void run()}
  >
    <Sparkles class="size-4" />
  </Button>

  <Dialog.Root bind:open>
    <Dialog.Content class="max-h-[min(90vh,640px)] max-w-lg gap-0 overflow-hidden p-0 sm:max-w-lg">
      <Dialog.Header class="border-border space-y-1 border-b px-6 py-4">
        <Dialog.Title class="flex items-center gap-2 text-base">
          <Sparkles class="text-primary size-4" />
          Summarize note
        </Dialog.Title>
        <Dialog.Description class="text-xs leading-relaxed">
          Uses the <span class="font-mono text-[11px]">note-summarizer</span> persona and your
          preferred model from Settings → Local AI. Everything runs in the browser on WebGPU.
        </Dialog.Description>
      </Dialog.Header>

      <div class="space-y-3 px-6 py-4">
        {#if phase === "gpu" || phase === "persona"}
          <p class="text-muted-foreground flex items-center gap-2 text-sm">
            <LoaderCircle class="size-4 shrink-0 animate-spin" />
            Preparing…
          </p>
        {:else if phase === "model"}
          <p class="text-muted-foreground flex items-center gap-2 text-sm">
            <LoaderCircle class="size-4 shrink-0 animate-spin" />
            {modelHint || "Loading model weights…"}
          </p>
        {:else if phase === "stream"}
          <p class="text-muted-foreground flex items-center gap-2 text-sm">
            <LoaderCircle class="size-4 shrink-0 animate-spin" />
            Writing summary…
          </p>
          {#if summary}
            <pre
              class="border-border bg-muted/30 max-h-[min(40vh,280px)] overflow-auto rounded-lg border p-3 font-sans text-[13px] leading-relaxed whitespace-pre-wrap"
            >{summary}</pre>
          {/if}
        {:else if phase === "done"}
          <pre
            class="border-border bg-muted/30 max-h-[min(48vh,360px)] overflow-auto rounded-lg border p-3 font-sans text-[13px] leading-relaxed whitespace-pre-wrap"
          >{summary}</pre>
        {:else if phase === "error" && errorMessage}
          <p class="text-destructive text-sm leading-relaxed" role="alert">{errorMessage}</p>
        {/if}
      </div>

      <Dialog.Footer class="border-border bg-muted/20 flex flex-wrap gap-2 border-t px-6 py-3">
        <Button type="button" variant="outline" onclick={() => (open = false)}>Close</Button>
        {#if phase === "done" && summary}
          <Button type="button" variant="secondary" onclick={copySummary}>
            <Copy class="mr-2 size-4" />
            Copy
          </Button>
          <Button type="button" onclick={insertBelowCursor}>
            <CornerDownLeft class="mr-2 size-4" />
            Insert below cursor
          </Button>
        {/if}
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>
</span>
