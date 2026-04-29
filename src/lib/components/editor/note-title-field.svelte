<script lang="ts">
  import { onDestroy, tick } from "svelte";
  import { invalidateAll } from "$app/navigation";
  import { Button } from "$lib/components/ui/button/index.js";
  import { generateNoteAiTitle } from "$lib/ai/note-title-ai";
  import { toast } from "$lib/toasts/toast";
  import { Sparkles, LoaderCircle } from "@lucide/svelte";

  let {
    noteId,
    initialTitle,
    getPlainText,
    onSaveStatus,
  }: {
    noteId: string;
    initialTitle: string;
    getPlainText: () => string;
    onSaveStatus?: (s: "idle" | "saving" | "saved" | "error") => void;
  } = $props();

  // svelte-ignore state_referenced_locally (initialTitle is correct on each fresh mount)
  let value = $state(initialTitle);
  let editing = $state(false);

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let aiBusy = $state(false);

  let inputEl = $state<HTMLInputElement | null>(null);

  $effect(() => {
    if (!editing) value = initialTitle;
  });

  async function saveTitle(next: string) {
    onSaveStatus?.("saving");
    try {
      const r = await fetch(`/api/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: next }),
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
    debounceTimer = setTimeout(() => {
      void saveTitle(value.trim() === "" ? "Untitled note" : value.trim());
    }, 550);
  }

  async function commitAndExit() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = null;
    await saveTitle(value.trim() === "" ? "Untitled note" : value.trim());
    editing = false;
  }

  async function startEditing() {
    editing = true;
    await tick();
    inputEl?.focus();
    inputEl?.select();
  }

  function onInputBlur() {
    void commitAndExit();
  }

  function onTitleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      void commitAndExit();
    }
  }

  async function runAiTitle() {
    const plain = getPlainText();
    if (!plain.trim()) {
      toast("Add some note content first.");
      return;
    }
    aiBusy = true;
    try {
      const next = await generateNoteAiTitle({
        currentTitle: value.trim() || "Untitled note",
        plainText: plain,
      });
      value = next;
      await saveTitle(next.trim() === "" ? "Untitled note" : next.trim());
      toast("Title updated.", { variant: "success" });
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
      class="hover:bg-accent/50 border-border text-foreground focus-visible:ring-ring/40 max-w-full rounded-xl border border-transparent px-1 py-1 text-left text-[1.35rem] leading-snug font-semibold tracking-[-0.02em] transition-colors focus-visible:ring-[3px] focus-visible:outline-none sm:text-[1.45rem]"
      onclick={() => void startEditing()}
    >
      {value.trim() === "" ? "Untitled note" : value}
    </button>
  {:else}
    <label class="block w-full" for="note-title-{noteId}">
      <span class="sr-only">Note title</span>
      <input
        bind:this={inputEl}
        id="note-title-{noteId}"
        type="text"
        autocomplete="off"
        spellcheck={true}
        placeholder="Untitled note"
        bind:value
        oninput={scheduleSave}
        onblur={onInputBlur}
        onkeydown={onTitleKeydown}
        class="border-input bg-muted/20 font-sans placeholder:text-muted-foreground/55 focus-visible:ring-ring/35 w-full rounded-lg border px-3 py-2 text-xl leading-snug font-semibold tracking-[-0.015em] shadow-none outline-none transition-[box-shadow,background-color,border-color] focus-visible:border-ring focus-visible:bg-background focus-visible:ring-[3px] sm:text-[1.35rem]"
      />
    </label>
  {/if}
  </div>
  <Button
    type="button"
    variant="ghost"
    size="icon-sm"
    class="text-muted-foreground hover:text-foreground mt-0.5 size-8 shrink-0"
    title="Suggest title with local AI"
    disabled={aiBusy}
    onclick={() => void runAiTitle()}
  >
    {#if aiBusy}
      <LoaderCircle class="size-4 animate-spin" />
    {:else}
      <Sparkles class="size-4 opacity-80" />
    {/if}
  </Button>
</div>
