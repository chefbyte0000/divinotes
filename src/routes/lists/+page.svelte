<script lang="ts">
  import { goto, invalidateAll } from "$app/navigation";

  let { data } = $props();

  let creating = $state(false);

  async function createList() {
    creating = true;
    try {
      const r = await fetch("/api/smart-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!r.ok) return;
      const { id } = (await r.json()) as { id: string };
      await goto(`/list/${id}`);
      await invalidateAll();
    } finally {
      creating = false;
    }
  }

  function formatUpdated(u: Date | string) {
    const d = u instanceof Date ? u : new Date(u);
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }
</script>

<svelte:head>
  <title>Lists · Divinotes</title>
</svelte:head>

<div class="mx-auto flex w-full max-w-5xl flex-col gap-10 px-1">
  <div class="flex flex-wrap items-start justify-between gap-4">
    <div class="space-y-1">
      <p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Smart lists</p>
      <h1 class="text-3xl font-semibold tracking-tight">Everything lists</h1>
      <p class="text-muted-foreground max-w-prose text-sm leading-relaxed">
        One surface for groceries, launch plans, reading queues, or experiments — structured rows, board lanes, and an
        assist strip ready for on-device models. Scoped to projects like your notes.
      </p>
    </div>

    <button
      type="button"
      class="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 shrink-0 items-center rounded-lg px-5 text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
      disabled={creating}
      onclick={() => void createList()}
    >
      {creating ? "Creating…" : "New list"}
    </button>
  </div>

  {#if data.lists.length === 0}
    <div
      class="border-border bg-muted/10 text-muted-foreground rounded-xl border border-dashed px-6 py-14 text-center text-sm leading-relaxed"
    >
      No lists yet — create one to try checklist, board, and table views.
    </div>
  {:else}
    <ul class="grid gap-3 sm:grid-cols-2">
      {#each data.lists as L (L.id)}
        <li>
          <a
            href="/list/{L.id}"
            class="border-border bg-card shadow-xs hover:bg-muted/35 group flex flex-col rounded-xl border p-4 transition-colors"
          >
            <span class="group-hover:text-primary line-clamp-2 font-medium leading-snug">
              {L.title?.trim() ? L.title : "Untitled list"}
            </span>
            <span class="text-muted-foreground mt-2 text-[11px]">
              {L.projectId ? L.projectName ?? "Project" : "General"}
            </span>
            <span class="text-muted-foreground mt-3 text-[11px] tabular-nums">
              Updated {formatUpdated(L.updatedAt)}
            </span>
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</div>
