<script lang="ts">
  import { onDestroy, tick } from "svelte";
  import { invalidateAll } from "$app/navigation";
  import { Button } from "$lib/components/ui/button/index.js";
  import { generateNoteAiDescription } from "$lib/ai/note-description-ai";
  import { toast } from "$lib/toasts/toast";
  import { Sparkles, LoaderCircle } from "@lucide/svelte";

  let {
    noteId,
    noteTitle = "",
    initialDescription = "",
    getPlainText,
    onSaveStatus,
  }: {
    noteId: string;
    noteTitle?: string;
    initialDescription?: string;
    getPlainText: () => string;
    onSaveStatus?: (s: "idle" | "saving" | "saved" | "error") => void;
  } = $props();

  // svelte-ignore state_referenced_locally
  let value = $state(initialDescription);
  let editing = $state(false);
  let aiBusy = $state(false);
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let textareaEl = $state<HTMLTextAreaElement | null>(null);

  $effect(() => {
    if (!editing) value = initialDescription ?? "";
  });

  async function save(next: string) {
    onSaveStatus?.("saving");
    try {
      const r = await fetch(`/api/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: next }),
      });
      if (!r.ok) throw new Error(String(r.status));
      onSaveStatus?.("saved");
      await invalidateAll();
      setTimeout(() => onSaveStatus?.("idle"), 1400);
    } catch {
      onSaveStatus?.("error");
    }
  }

  function scheduleSave() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => void save(value.trim()), 550);
  }

  async function commitAndExit() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = null;
    await save(value.trim());
    editing = false;
  }

  async function startEditing() {
    editing = true;
    await tick();
    textareaEl?.focus();
  }

  async function runAi() {
    const plain = getPlainText();
    if (!plain.trim()) {
      toast("Add some note content first.");
      return;
    }
    aiBusy = true;
    try {
      const text = await generateNoteAiDescription({
        noteTitle,
        plainText: plain,
      });
      value = text;
      await save(text.trim());
      toast("Description updated.", { variant: "success" });
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), { variant: "destructive" });
    } finally {
      aiBusy = false;
    }
  }

  onDestroy(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
  });
</script>

<div class="flex w-full min-w-0 items-start gap-1.5 px-1">
  <div class="min-w-0 flex-1">
      {#if !editing}
        <button
          type="button"
          class="hover:bg-accent/40 border-border text-muted-foreground focus-visible:ring-ring/40 min-h-[2.75rem] w-full max-w-full rounded-xl border border-transparent px-2 py-2 text-left text-[0.95rem] leading-snug transition-colors focus-visible:ring-[3px] focus-visible:outline-none sm:text-[1rem]"
          onclick={() => void startEditing()}
        >
          {#if value.trim()}
            <span class="text-foreground/90 line-clamp-3">{value.trim()}</span>
          {:else}
            <span class="text-muted-foreground/80">Add a short description…</span>
          {/if}
        </button>
      {:else}
        <label class="block w-full min-w-0" for="note-desc-{noteId}">
          <span class="sr-only">Note description</span>
          <textarea
            bind:this={textareaEl}
            id="note-desc-{noteId}"
            rows={3}
            autocomplete="off"
            spellcheck={true}
            placeholder="Short plain-text description for this note"
            bind:value
            oninput={scheduleSave}
            onblur={() => void commitAndExit()}
            class="border-input bg-muted/20 text-foreground placeholder:text-muted-foreground/55 focus-visible:ring-ring/35 field-sizing-content min-h-[4.5rem] w-full resize-y rounded-lg border px-3 py-2 text-[0.95rem] leading-snug shadow-none outline-none transition-[box-shadow,background-color,border-color] focus-visible:border-ring focus-visible:bg-background focus-visible:ring-[3px] sm:text-[1rem]"
          ></textarea>
        </label>
      {/if}
    </div>
  <Button
    type="button"
    variant="ghost"
    size="icon-sm"
    class="text-muted-foreground hover:text-foreground mt-0.5 size-8 shrink-0"
    title="Generate description with local AI"
    disabled={aiBusy}
    onclick={() => void runAi()}
  >
    {#if aiBusy}
      <LoaderCircle class="size-4 animate-spin" />
    {:else}
      <Sparkles class="size-4 opacity-80" />
    {/if}
  </Button>
</div>
