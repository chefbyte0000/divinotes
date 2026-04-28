<script lang="ts">
  import { flip } from "svelte/animate";
  import { invalidateAll } from "$app/navigation";
  import {
    dndzone,
    SHADOW_PLACEHOLDER_ITEM_ID,
    type DndEvent,
  } from "svelte-dnd-action";
  import type { ProjectNoteRow } from "$lib/types/project-notes";
  import {
    DEFAULT_KANBAN_STATUSES,
    normalizeKanbanStatus,
    type DefaultKanbanStatus,
  } from "$lib/project/kanban-status";

  type KanbanItem = { id: string; note: ProjectNoteRow };

  let { notes }: { notes: ProjectNoteRow[] } = $props();

  let board = $state<Record<DefaultKanbanStatus, KanbanItem[]>>(buildBoard([]));
  let saving = $state(false);

  function buildBoard(rows: ProjectNoteRow[]): Record<DefaultKanbanStatus, KanbanItem[]> {
    const next: Record<DefaultKanbanStatus, KanbanItem[]> = {
      "To Do": [],
      Doing: [],
      Done: [],
    };
    for (const n of rows) {
      const st = normalizeKanbanStatus(n.metadata?.status);
      next[st].push({ id: n.id, note: n });
    }
    return next;
  }

  $effect(() => {
    board = buildBoard(notes);
  });

  const flipDurationMs = 180;

  function handleConsider(status: DefaultKanbanStatus, e: CustomEvent<DndEvent<KanbanItem>>) {
    board = { ...board, [status]: e.detail.items };
  }

  async function handleFinalize(status: DefaultKanbanStatus, e: CustomEvent<DndEvent<KanbanItem>>) {
    board = { ...board, [status]: e.detail.items };
    await persistStatusChanges();
  }

  async function persistStatusChanges() {
    const updates: { id: string; status: DefaultKanbanStatus }[] = [];
    for (const status of DEFAULT_KANBAN_STATUSES) {
      for (const item of board[status]) {
        if (item.id === SHADOW_PLACEHOLDER_ITEM_ID) continue;
        if (normalizeKanbanStatus(item.note.metadata?.status) !== status) {
          updates.push({ id: item.id, status });
        }
      }
    }
    if (updates.length === 0) return;

    saving = true;
    try {
      for (const u of updates) {
        const r = await fetch(`/api/notes/${u.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ metadata: { status: u.status } }),
        });
        if (!r.ok) throw new Error("Failed to update note");
      }
      await invalidateAll();
    } catch {
      await invalidateAll();
    } finally {
      saving = false;
    }
  }

  function titleOf(note: ProjectNoteRow) {
    return note.title?.trim() ? note.title : "Untitled note";
  }

  function visibleItems(items: KanbanItem[]) {
    return items.filter((i) => i.id !== SHADOW_PLACEHOLDER_ITEM_ID);
  }
</script>

<div class="relative space-y-3">
  {#if saving}
    <p class="text-muted-foreground absolute end-0 top-0 text-xs" aria-live="polite">Saving…</p>
  {/if}

  <div class="flex gap-4 overflow-x-auto pb-2">
    {#each DEFAULT_KANBAN_STATUSES as status (status)}
      <div
        class="border-border bg-muted/15 flex min-h-[220px] min-w-[min(100%,280px)] flex-1 flex-col rounded-xl border"
      >
        <header
          class="border-border flex items-center justify-between border-b px-3 py-2.5 text-sm font-medium"
        >
          <span>{status}</span>
          <span class="text-muted-foreground text-xs tabular-nums">
            {visibleItems(board[status]).length}
          </span>
        </header>

        <section
          class="flex min-h-[160px] flex-1 flex-col gap-2 p-2"
          aria-label={`${status} notes`}
          use:dndzone={{
            items: board[status],
            flipDurationMs,
            dropTargetClasses: ["ring-primary/25", "ring-2", "rounded-lg"],
          }}
          onconsider={(e) => handleConsider(status, e)}
          onfinalize={(e) => handleFinalize(status, e)}
        >
          {#each board[status] as item (item.id)}
            <div
              animate:flip={{ duration: flipDurationMs }}
              class={item.id === SHADOW_PLACEHOLDER_ITEM_ID ?
                "pointer-events-none min-h-0 opacity-0"
              : "border-border bg-card shadow-xs rounded-lg border px-3 py-2.5"}
            >
              {#if item.id !== SHADOW_PLACEHOLDER_ITEM_ID}
                <a
                  href="/note/{item.note.id}"
                  class="text-primary hover:text-primary/80 line-clamp-2 text-sm font-medium leading-snug underline-offset-4 hover:underline"
                >
                  {titleOf(item.note)}
                </a>
                {#if item.note.metadata?.tags?.length}
                  <p class="text-muted-foreground mt-1.5 line-clamp-2 text-[11px]">
                    {(item.note.metadata.tags ?? []).join(" · ")}
                  </p>
                {/if}
              {/if}
            </div>
          {/each}
        </section>
      </div>
    {/each}
  </div>

  <p class="text-muted-foreground text-xs leading-relaxed">
    Drag cards between columns to update <span class="font-mono">metadata.status</span>. Notes without a
    recognized status appear in To Do.
  </p>
</div>
