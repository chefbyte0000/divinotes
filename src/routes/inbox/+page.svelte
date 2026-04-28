<script lang="ts">
  import { tryGetActiveProject } from "$lib/workspace/active-project-api";

  let { data } = $props();

  const ctx = tryGetActiveProject();
</script>

<svelte:head>
  <title>Inbox · Divinotes</title>
</svelte:head>

<div class="mx-auto flex max-w-3xl flex-col gap-6">
  <div class="space-y-1">
    <h1 class="text-2xl font-semibold tracking-tight">Inbox</h1>
    <p class="text-muted-foreground text-sm leading-relaxed">
      Notes from the last 24 hours still in <span class="text-foreground font-medium">General</span> (not moved into a project folder).
    </p>
  </div>

  {#if ctx && ctx.activeProjectId === null}
    <p class="text-muted-foreground font-mono text-xs leading-relaxed" aria-live="polite">
      {ctx.aiContextDirective()}
    </p>
  {/if}

  {#if data.inboxNotes.length === 0}
    <div
      class="rounded-xl border border-dashed bg-muted/20 px-6 py-12 text-center text-muted-foreground text-sm"
    >
      Nothing in the inbox right now.
    </div>
  {:else}
    <ul class="divide-y rounded-xl border bg-card">
      {#each data.inboxNotes as note (note.id)}
        <li class="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span class="font-medium">{note.title || "Untitled note"}</span>
          <time
            class="text-muted-foreground shrink-0 text-xs tabular-nums"
            datetime={note.createdAt.toISOString()}
          >
            {note.createdAt.toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </time>
        </li>
      {/each}
    </ul>
  {/if}
</div>
