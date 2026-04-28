<script lang="ts">
  import { page } from "$app/state";
</script>

<svelte:head>
  <title>Projects · Divinotes</title>
</svelte:head>

<div class="mx-auto max-w-2xl space-y-4">
  <h1 class="text-2xl font-semibold tracking-tight">Projects</h1>
  <p class="text-muted-foreground text-sm leading-relaxed">
    Open a project from the sidebar, or create one with <span class="text-foreground font-medium">Create Project</span>.
  </p>

  {#if (page.data.projects?.length ?? 0) === 0}
    <p class="text-muted-foreground text-sm">No projects yet.</p>
  {:else}
    <ul class="divide-y rounded-xl border">
      {#each page.data.projects ?? [] as p (p.id)}
        <li>
          <a
            class="block px-4 py-3 text-sm font-medium hover:bg-muted/50"
            href="/project/{p.id}"
          >
            {p.name}
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</div>
