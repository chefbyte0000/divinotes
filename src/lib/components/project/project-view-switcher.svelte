<script lang="ts">
  import { onMount } from "svelte";
  import { LayoutGrid, List, SquareKanban } from "@lucide/svelte";
  import { cn } from "$lib/utils.js";
  import type { ProjectViewMode } from "$lib/types/project-views";

  let {
    projectId,
    view = $bindable<ProjectViewMode>("grid"),
  }: {
    projectId: string;
    view?: ProjectViewMode;
  } = $props();

  const storageKey = () => `divinotes.projectView.${projectId}`;

  onMount(() => {
    try {
      const raw = localStorage.getItem(storageKey());
      if (raw === "grid" || raw === "list" || raw === "kanban") view = raw;
    } catch {
      /* ignore */
    }
  });

  function choose(mode: ProjectViewMode) {
    view = mode;
    try {
      localStorage.setItem(storageKey(), mode);
    } catch {
      /* ignore */
    }
  }

  const modes: {
    id: ProjectViewMode;
    label: string;
    Icon: typeof LayoutGrid;
  }[] = [
    { id: "grid", label: "Grid", Icon: LayoutGrid },
    { id: "list", label: "List", Icon: List },
    { id: "kanban", label: "Kanban", Icon: SquareKanban },
  ];
</script>

<div
  role="group"
  aria-label="Project notes layout"
  class="bg-muted/40 inline-flex gap-0.5 rounded-lg border p-0.5"
>
  {#each modes as m (m.id)}
    <button
      type="button"
      aria-pressed={view === m.id}
      class={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors",
        view === m.id ?
          "bg-background text-foreground shadow-sm"
        : "text-muted-foreground hover:text-foreground",
      )}
      onclick={() => choose(m.id)}
    >
      <m.Icon class="size-3.5 shrink-0" aria-hidden="true" />
      {m.label}
    </button>
  {/each}
</div>
