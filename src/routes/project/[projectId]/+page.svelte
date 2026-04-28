<script lang="ts">
  import { goto, invalidateAll } from "$app/navigation";
  import DeleteNoteDialog from "$lib/components/editor/delete-note-dialog.svelte";
  import ProjectNotesKanbanView from "$lib/components/project/project-notes-kanban-view.svelte";
  import ProjectNotesListView from "$lib/components/project/project-notes-list-view.svelte";
  import ProjectViewSwitcher from "$lib/components/project/project-view-switcher.svelte";
  import type { ProjectViewMode } from "$lib/types/project-views";
  import { tryGetActiveProject } from "$lib/workspace/active-project-api";

  let { data } = $props();

  const ctx = tryGetActiveProject();

  let creatingNote = $state(false);
  let creatingList = $state(false);
  let view = $state<ProjectViewMode>("grid");

  async function createSmartList() {
    creatingList = true;
    try {
      const r = await fetch("/api/smart-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: data.project.id }),
      });
      if (!r.ok) return;
      const { id } = (await r.json()) as { id: string };
      await goto(`/list/${id}`);
      await invalidateAll();
    } finally {
      creatingList = false;
    }
  }

  async function createNote() {
    creatingNote = true;
    try {
      const r = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: data.project.id }),
      });
      if (!r.ok) return;
      const { id } = (await r.json()) as { id: string };
      await goto(`/note/${id}`);
      await invalidateAll();
    } finally {
      creatingNote = false;
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
  <title>{data.project.name} · Divinotes</title>
</svelte:head>

<div class="mx-auto flex w-full max-w-6xl flex-col gap-10 px-1">
  <div class="flex flex-wrap items-start justify-between gap-4">
    <div class="space-y-1">
      <p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Project</p>
      <h1 class="text-3xl font-semibold tracking-tight">{data.project.name}</h1>
      {#if data.project.description}
        <p class="text-muted-foreground max-w-prose text-sm leading-relaxed">{data.project.description}</p>
      {/if}
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <button
        type="button"
        class="border-border bg-card text-foreground hover:bg-muted/60 inline-flex h-10 shrink-0 items-center rounded-lg border px-4 text-sm font-medium shadow-xs transition-colors disabled:opacity-50"
        disabled={creatingList}
        onclick={() => void createSmartList()}
      >
        {creatingList ? "Creating…" : "New list"}
      </button>
      <button
        type="button"
        class="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 shrink-0 items-center rounded-lg px-5 text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
        disabled={creatingNote}
        onclick={() => void createNote()}
      >
        {creatingNote ? "Creating…" : "New note"}
      </button>
    </div>
  </div>

  {#if ctx?.activeProjectId === data.project.id}
    <p class="text-muted-foreground font-mono text-xs leading-relaxed">{ctx.aiContextDirective()}</p>
  {/if}

  <section class="space-y-4" aria-labelledby="project-lists-heading">
    <div class="flex flex-wrap items-baseline gap-x-3 gap-y-2">
      <h2 id="project-lists-heading" class="text-lg font-semibold tracking-tight">Smart lists</h2>
      <span class="text-muted-foreground text-xs tabular-nums">
        {data.projectSmartLists.length}
        {data.projectSmartLists.length === 1 ? "list" : "lists"}
      </span>
    </div>

    {#if data.projectSmartLists.length === 0}
      <div
        class="border-border bg-muted/10 text-muted-foreground rounded-xl border border-dashed px-6 py-10 text-center text-sm leading-relaxed"
      >
        Project-scoped lists for habits, packing, launches — separate from long-form notes.
      </div>
    {:else}
      <ul class="grid gap-3 sm:grid-cols-2">
        {#each data.projectSmartLists as L (L.id)}
          <li>
            <a
              href="/list/{L.id}"
              class="border-border bg-card shadow-xs hover:bg-muted/35 group flex flex-col rounded-xl border p-4 transition-colors"
            >
              <span class="group-hover:text-primary line-clamp-2 font-medium leading-snug">
                {L.title?.trim() ? L.title : "Untitled list"}
              </span>
              <span class="text-muted-foreground mt-3 text-[11px] tabular-nums">
                Updated {formatUpdated(L.updatedAt)}
              </span>
            </a>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section class="space-y-4" aria-labelledby="project-notes-heading">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap items-baseline gap-x-3 gap-y-2">
        <h2 id="project-notes-heading" class="text-lg font-semibold tracking-tight">Notes</h2>
        <span class="text-muted-foreground text-xs tabular-nums">
          {data.projectNotes.length}
          {data.projectNotes.length === 1 ? "note" : "notes"}
        </span>
      </div>
      {#if data.projectNotes.length > 0}
        <ProjectViewSwitcher bind:view projectId={data.project.id} />
      {/if}
    </div>

    {#if data.projectNotes.length === 0}
      <div
        class="border-border bg-muted/10 text-muted-foreground rounded-xl border border-dashed px-6 py-14 text-center text-sm leading-relaxed"
      >
        No notes yet — create one to open the editor.
      </div>
    {:else if view === "list"}
      <ProjectNotesListView notes={data.projectNotes} />
    {:else if view === "kanban"}
      <ProjectNotesKanbanView notes={data.projectNotes} />
    {:else}
      <ul class="grid gap-3 sm:grid-cols-2">
        {#each data.projectNotes as n (n.id)}
          <li class="border-border bg-card shadow-xs hover:bg-muted/35 group relative rounded-xl border transition-colors">
            <a href="/note/{n.id}" class="flex flex-col p-4 pe-12">
              <span class="group-hover:text-primary line-clamp-2 font-medium leading-snug">
                {n.title?.trim() ? n.title : "Untitled note"}
              </span>
              <span class="text-muted-foreground mt-3 text-[11px] tabular-nums">
                Updated {formatUpdated(n.updatedAt)}
              </span>
            </a>
            <div
              class="absolute right-2 top-2 opacity-85 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
            >
              <DeleteNoteDialog noteId={n.id} noteTitle={n.title ?? ""} variant="icon" />
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</div>
