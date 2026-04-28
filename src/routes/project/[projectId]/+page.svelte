<script lang="ts">
  import { tryGetActiveProject } from "$lib/workspace/active-project-api";

  let { data } = $props();

  const ctx = tryGetActiveProject();
</script>

<svelte:head>
  <title>{data.project.name} · Divinotes</title>
</svelte:head>

<div class="mx-auto flex max-w-3xl flex-col gap-6">
  <div class="space-y-1">
    <p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Project</p>
    <h1 class="text-2xl font-semibold tracking-tight">{data.project.name}</h1>
    {#if data.project.description}
      <p class="text-muted-foreground text-sm">{data.project.description}</p>
    {/if}
  </div>

  {#if ctx?.activeProjectId === data.project.id}
    <p class="text-muted-foreground font-mono text-xs leading-relaxed">
      {ctx.aiContextDirective()}
    </p>
  {/if}

  <div
    class="rounded-xl border border-dashed bg-muted/15 px-6 py-12 text-center text-muted-foreground text-sm"
  >
    Note editor and graph scaffolding ship in a later epic — active context is wired for AI and queries.
  </div>
</div>
