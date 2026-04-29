<script lang="ts">
  import { onDestroy } from "svelte";
  import { invalidateAll } from "$app/navigation";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { sanitizeTagList, normalizeTagToken } from "$lib/notes/note-tags";
  import { generateNoteAutoTags } from "$lib/ai/note-auto-tags-ai";
  import { toast } from "$lib/toasts/toast";
  import { Sparkles, LoaderCircle, X } from "@lucide/svelte";

  let {
    noteId,
    noteTitle = "",
    initialTags = [],
    getPlainText,
    onSaveStatus,
  }: {
    noteId: string;
    noteTitle?: string;
    initialTags?: string[];
    getPlainText: () => string;
    onSaveStatus?: (s: "idle" | "saving" | "saved" | "error") => void;
  } = $props();

  // svelte-ignore state_referenced_locally (synced via $effect when initialTags changes)
  let tags = $state<string[]>(sanitizeTagList(initialTags ?? []));
  let draft = $state("");
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let aiBusy = $state(false);
  let inputEl = $state<HTMLInputElement | null>(null);

  $effect(() => {
    tags = sanitizeTagList(initialTags ?? []);
  });

  function schedulePersist(next: string[]) {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => void persist(next), 450);
  }

  async function persist(next: string[]) {
    onSaveStatus?.("saving");
    try {
      const r = await fetch(`/api/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata: { tags: next } }),
      });
      if (!r.ok) throw new Error(String(r.status));
      onSaveStatus?.("saved");
      await invalidateAll();
      setTimeout(() => onSaveStatus?.("idle"), 1200);
    } catch {
      onSaveStatus?.("error");
      toast("Could not save tags.", { variant: "destructive" });
    }
  }

  function commitDraft() {
    const token = normalizeTagToken(draft);
    draft = "";
    if (!token || tags.map((x) => x.toLowerCase()).includes(token.toLowerCase())) return;
    const next = sanitizeTagList([...tags, token]);
    if (next.length === tags.length) return;
    tags = next;
    schedulePersist(next);
  }

  function removeTag(t: string) {
    const next = tags.filter((x) => x !== t);
    tags = next;
    schedulePersist(next);
  }

  function onDraftKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commitDraft();
    } else if (e.key === "Backspace" && draft === "" && tags.length > 0) {
      removeTag(tags[tags.length - 1]!);
    }
  }

  async function runAutoTag() {
    const plain = getPlainText();
    if (!plain.trim()) {
      toast("Add some note content before auto-tagging.");
      return;
    }
    aiBusy = true;
    try {
      const merged = await generateNoteAutoTags({
        noteTitle,
        plainText: plain,
        existingTags: tags,
      });
      const r = await fetch(`/api/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata: { tags: merged } }),
      });
      if (!r.ok) throw new Error(`Could not save (${r.status})`);
      tags = sanitizeTagList(merged);
      toast("Tags updated from your note.", { variant: "success" });
      await invalidateAll();
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
  <div
    class="border-input bg-muted/15 focus-within:border-ring focus-within:ring-ring/35 flex min-h-[2.75rem] min-w-0 flex-1 flex-wrap items-center gap-1.5 rounded-xl border px-2 py-1.5 shadow-none transition-[border-color,box-shadow]"
  >
    {#each tags as t (t)}
      <Badge variant="secondary" class="h-7 gap-0.5 py-0 pr-0.5 pl-2 text-xs font-normal">
        <span class="max-w-[14rem] truncate">{t}</span>
        <button
          type="button"
          class="hover:bg-muted shrink-0 rounded-md p-1"
          onclick={() => removeTag(t)}
          aria-label={`Remove tag ${t}`}
        >
          <X class="size-3 opacity-70" />
        </button>
      </Badge>
    {/each}
    <Input
      bind:ref={inputEl}
      type="text"
      autocomplete="off"
      placeholder={tags.length === 0 ? "Add tags…" : "Add another…"}
      bind:value={draft}
      onkeydown={onDraftKeydown}
      onblur={commitDraft}
      class="placeholder:text-muted-foreground/80 min-h-8 min-w-[9rem] flex-1 border-0 bg-transparent px-1 py-1 text-sm shadow-none focus-visible:ring-0 md:text-sm"
    />
  </div>
  <Button
    type="button"
    variant="ghost"
    size="icon-sm"
    class="text-muted-foreground hover:text-foreground mt-0.5 size-8 shrink-0"
    title="Suggest tags with local AI"
    disabled={aiBusy}
    onclick={() => void runAutoTag()}
  >
    {#if aiBusy}
      <LoaderCircle class="size-4 animate-spin" />
    {:else}
      <Sparkles class="size-4 opacity-80" />
    {/if}
  </Button>
</div>
