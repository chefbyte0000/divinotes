<script lang="ts">
  import { tryGetActiveProject } from "$lib/workspace/active-project-api";

  const ctx = tryGetActiveProject();
</script>

<svelte:head>
  <title>General · Divinotes</title>
</svelte:head>

<div class="mx-auto flex max-w-3xl flex-col gap-4">
  <div class="space-y-1">
    <h1 class="text-2xl font-semibold tracking-tight">General workspace</h1>
    <p class="text-muted-foreground text-sm leading-relaxed">
      Notes without a project folder stay here. Use <a class="text-foreground underline underline-offset-4" href="/inbox">Inbox</a> for fresh items still in General.
    </p>
  </div>

  {#if ctx?.activeProjectId === null}
    <p class="text-muted-foreground font-mono text-xs leading-relaxed">{ctx.aiContextDirective()}</p>
  {/if}
</div>
