<script lang="ts">
  import { onDestroy } from "svelte";
  import type { SmartListItemRow, SmartListMetadata } from "$lib/types/smart-list";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import {
    DEFAULT_BOARD_LANES,
    newSmartListItem,
    resolveLane,
    splitTextIntoItems,
  } from "$lib/smart-list/item-utils";
  import { cn } from "$lib/utils.js";
  import { Sparkles, LayoutList, Columns3, Table2, Plus } from "@lucide/svelte";

  let {
    listId,
    initialTitle,
    initialDescription,
    initialItems,
    initialMetadata,
    workspaceLabel,
    projectNamesById,
  }: {
    listId: string;
    initialTitle: string;
    initialDescription: string | null;
    initialItems: SmartListItemRow[];
    initialMetadata: SmartListMetadata;
    workspaceLabel: string;
    projectNamesById: Record<string, string>;
  } = $props();

  let title = $state(initialTitle);
  let description = $state(initialDescription ?? "");
  let items = $state<SmartListItemRow[]>([...initialItems]);
  let metaView = $state<NonNullable<SmartListMetadata["view"]>>(initialMetadata.view ?? "checklist");
  let aiFocus = $state(initialMetadata.aiFocus ?? "");
  let brainDump = $state("");
  let saveStatus = $state<"idle" | "saving" | "saved" | "error">("idle");

  let hydratedForListId = $state<string | null>(null);

  $effect(() => {
    if (hydratedForListId === listId) return;
    hydratedForListId = listId;
    title = initialTitle;
    description = initialDescription ?? "";
    items = [...initialItems];
    metaView = initialMetadata.view ?? "checklist";
    aiFocus = initialMetadata.aiFocus ?? "";
  });

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  async function persist(patch: Record<string, unknown>) {
    saveStatus = "saving";
    try {
      const r = await fetch(`/api/smart-lists/${listId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!r.ok) throw new Error(String(r.status));
      saveStatus = "saved";
      setTimeout(() => (saveStatus = "idle"), 1400);
    } catch {
      saveStatus = "error";
    }
  }

  function schedulePersist(patch: Record<string, unknown>, delay = 520) {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => void persist(patch), delay);
  }

  function updateItems(next: SmartListItemRow[]) {
    items = next;
    schedulePersist({ items: next });
  }

  function toggleDone(id: string) {
    updateItems(
      items.map((it) => (it.id === id ? { ...it, done: !it.done } : it)),
    );
  }

  function updateText(id: string, text: string) {
    updateItems(items.map((it) => (it.id === id ? { ...it, text } : it)));
  }

  function updateLane(id: string, lane: string) {
    updateItems(items.map((it) => (it.id === id ? { ...it, lane } : it)));
  }

  function removeItem(id: string) {
    updateItems(items.filter((it) => it.id !== id));
  }

  function addRow() {
    updateItems([...items, newSmartListItem("")]);
  }

  function mergeBrainDump() {
    const extra = splitTextIntoItems(brainDump);
    if (extra.length === 0) return;
    brainDump = "";
    updateItems([...items, ...extra]);
  }

  function setView(v: NonNullable<SmartListMetadata["view"]>) {
    metaView = v;
    void persist({ metadata: { view: v } });
  }

  function onTitleBlur() {
    void persist({ title: title.trim() || "Untitled list" });
  }

  function onDescriptionBlur() {
    void persist({ description: description.trim() || null });
  }

  function onAiFocusBlur() {
    void persist({ metadata: { aiFocus: aiFocus.trim() || undefined } });
  }

  onDestroy(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
  });

  let lanes = $derived([...DEFAULT_BOARD_LANES]);

  function itemsInLane(lane: string) {
    return items.filter((it) => resolveLane(it) === lane);
  }
</script>

<div class="mx-auto flex w-full max-w-[min(96rem,calc(100vw-2rem))] flex-col gap-8 lg:flex-row">
  <div class="min-w-0 flex-1 space-y-6">
    <div class="space-y-1">
      <p
        class="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.14em]"
      >
        {workspaceLabel}
      </p>
      <Input
        class="h-auto border-none px-0 text-3xl font-semibold tracking-tight shadow-none focus-visible:ring-0"
        value={title}
        oninput={(e) => (title = e.currentTarget.value)}
        onblur={onTitleBlur}
        aria-label="List title"
      />
      <textarea
        class="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring max-h-40 min-h-[72px] w-full resize-y rounded-lg border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
        placeholder="Purpose, scope, or stash context…"
        bind:value={description}
        onblur={onDescriptionBlur}
        rows={3}
      ></textarea>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <span class="text-muted-foreground me-1 text-xs font-medium uppercase tracking-wide">View</span>
      {#each [{ id: "checklist" as const, label: "Checklist", Icon: LayoutList }, { id: "board" as const, label: "Board", Icon: Columns3 }, { id: "table" as const, label: "Table", Icon: Table2 }] as opt (opt.id)}
        <Button
          type="button"
          variant={metaView === opt.id ? "secondary" : "outline"}
          size="sm"
          class="gap-1.5"
          onclick={() => setView(opt.id)}
        >
          <opt.Icon class="size-3.5 opacity-80" />
          {opt.label}
        </Button>
      {/each}
      <span class="text-muted-foreground ms-auto text-[11px] tabular-nums" aria-live="polite">
        {#if saveStatus === "saving"}
          Saving…
        {:else if saveStatus === "saved"}
          Saved
        {:else if saveStatus === "error"}
          Save failed
        {:else}
          Ready
        {/if}
      </span>
    </div>

    {#if metaView === "checklist"}
      <ul class="space-y-2">
        {#each items as it (it.id)}
          <li
            class="border-border bg-card flex flex-wrap items-start gap-3 rounded-xl border px-3 py-2.5 shadow-xs"
          >
            <input
              type="checkbox"
              class="border-input accent-primary mt-1 size-4 shrink-0 rounded"
              checked={!!it.done}
              onchange={() => toggleDone(it.id)}
              aria-label="Done"
            />
            <input
              class={cn(
                "min-w-0 flex-1 bg-transparent text-[15px] leading-snug outline-none",
                it.done && "text-muted-foreground line-through",
              )}
              value={it.text}
              oninput={(e) => updateText(it.id, e.currentTarget.value)}
            />
            <button
              type="button"
              class="text-muted-foreground hover:text-destructive text-xs font-medium"
              onclick={() => removeItem(it.id)}
            >
              Remove
            </button>
          </li>
        {/each}
      </ul>
      <Button type="button" variant="outline" size="sm" class="gap-1.5" onclick={addRow}>
        <Plus class="size-4" />
        Add row
      </Button>
    {:else if metaView === "board"}
      <div class="flex gap-4 overflow-x-auto pb-2">
        {#each lanes as lane (lane)}
          <div class="border-border bg-muted/15 flex min-h-[200px] min-w-[min(100%,260px)] flex-1 flex-col rounded-xl border">
            <header class="border-border border-b px-3 py-2 text-sm font-medium">{lane}</header>
            <ul class="flex flex-col gap-2 p-2">
              {#each itemsInLane(lane) as it (it.id)}
                <li class="border-border bg-card rounded-lg border px-2 py-2 shadow-xs">
                  <textarea
                    class="border-input bg-background mb-2 min-h-[52px] w-full resize-y rounded-md px-2 py-1 text-sm outline-none"
                    value={it.text}
                    oninput={(e) => updateText(it.id, e.currentTarget.value)}
                    rows={2}
                  ></textarea>
                  <label class="text-muted-foreground flex items-center gap-2 text-[11px]">
                    Lane
                    <select
                      class="border-input bg-background h-8 rounded-md border px-2 text-xs"
                      value={resolveLane(it)}
                      onchange={(e) => updateLane(it.id, e.currentTarget.value)}
                    >
                      {#each lanes as L (L)}
                        <option value={L}>{L}</option>
                      {/each}
                    </select>
                  </label>
                </li>
              {/each}
            </ul>
          </div>
        {/each}
      </div>
      <Button type="button" variant="outline" size="sm" class="gap-1.5" onclick={addRow}>
        <Plus class="size-4" />
        Add card
      </Button>
    {:else}
      <div class="border-border bg-card overflow-hidden rounded-xl border shadow-xs">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head class="w-12"></Table.Head>
              <Table.Head>Item</Table.Head>
              <Table.Head class="w-[140px]">Lane</Table.Head>
              <Table.Head class="w-28"></Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each items as it (it.id)}
              <Table.Row>
                <Table.Cell class="align-top">
                  <input
                    type="checkbox"
                    class="border-input accent-primary mt-1 size-4 rounded"
                    checked={!!it.done}
                    onchange={() => toggleDone(it.id)}
                  />
                </Table.Cell>
                <Table.Cell class="align-top">
                  <textarea
                    class="border-input bg-background min-h-[44px] w-full resize-y rounded-md px-2 py-1 text-sm outline-none"
                    value={it.text}
                    oninput={(e) => updateText(it.id, e.currentTarget.value)}
                    rows={2}
                  ></textarea>
                </Table.Cell>
                <Table.Cell class="align-top">
                  <select
                    class="border-input bg-background h-9 w-full rounded-md border px-2 text-xs"
                    value={resolveLane(it)}
                    onchange={(e) => updateLane(it.id, e.currentTarget.value)}
                  >
                    {#each lanes as L (L)}
                      <option value={L}>{L}</option>
                    {/each}
                  </select>
                </Table.Cell>
                <Table.Cell class="align-top">
                  <button
                    type="button"
                    class="text-muted-foreground hover:text-destructive text-xs font-medium"
                    onclick={() => removeItem(it.id)}
                  >
                    Remove
                  </button>
                </Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
      </div>
      <Button type="button" variant="outline" size="sm" class="gap-1.5" onclick={addRow}>
        <Plus class="size-4" />
        Add row
      </Button>
    {/if}
  </div>

  <aside
    class="border-border bg-muted/15 w-full shrink-0 space-y-4 rounded-2xl border p-4 lg:sticky lg:top-24 lg:max-w-[360px]"
  >
    <div class="flex items-center gap-2">
      <Sparkles class="text-primary size-5 shrink-0" />
      <div>
        <h2 class="text-sm font-semibold tracking-tight">Assist strip</h2>
        <p class="text-muted-foreground text-xs leading-relaxed">
          Capture fast, then structure. On-device models will plug into this lane once WebGPU is ready.
        </p>
      </div>
    </div>

    <div class="space-y-2">
      <label class="text-xs font-medium" for="ai-focus">Focus for AI (optional)</label>
      <textarea
        id="ai-focus"
        class="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-[72px] w-full resize-y rounded-lg border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
        placeholder="e.g. “Groceries · this week”, “Launch checklist”, “Reading queue”"
        bind:value={aiFocus}
        onblur={onAiFocusBlur}
        rows={3}
      ></textarea>
    </div>

    <div class="space-y-2">
      <label class="text-xs font-medium" for="brain-dump">Brain dump</label>
      <textarea
        id="brain-dump"
        class="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-[120px] w-full resize-y rounded-lg border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
        placeholder="Paste lines, meeting notes, or a messy outline — split into rows below."
        bind:value={brainDump}
        rows={6}
      ></textarea>
      <Button type="button" size="sm" class="w-full gap-2" onclick={mergeBrainDump}>
        <Sparkles class="size-3.5" />
        Split into rows
      </Button>
    </div>

    {#if Object.keys(projectNamesById).length > 0}
      <div class="text-muted-foreground border-border border-t pt-3 text-[11px] leading-relaxed">
        Projects in this workspace:
        <span class="text-foreground font-medium">
          {Object.values(projectNamesById).slice(0, 6).join(" · ")}
        </span>
      </div>
    {/if}
  </aside>
</div>
