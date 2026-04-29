<script lang="ts">
  import * as Popover from "$lib/components/ui/popover/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";

  let { tags }: { tags: string[] } = $props();

  let open = $state(false);
  const joined = $derived(tags.join(" · "));
</script>

{#if tags.length === 0}
  <span class="text-muted-foreground">—</span>
{:else}
  <Popover.Root bind:open>
    <div class="flex max-w-full min-w-0 items-center gap-0.5">
      <p
        class="text-muted-foreground line-clamp-1 min-w-0 flex-1 text-left text-xs leading-snug"
        title={joined}
      >
        {joined}
      </p>
      <Popover.Trigger>
        {#snippet child({ props })}
          <Button
            {...props}
            type="button"
            variant="ghost"
            size="sm"
            class="text-muted-foreground hover:text-foreground h-7 shrink-0 px-1 text-xs font-medium tabular-nums"
          >
            …
          </Button>
        {/snippet}
      </Popover.Trigger>
    </div>
    <Popover.Content class="max-h-72 w-72 overflow-y-auto p-3" align="start" sideOffset={4}>
      <p class="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-wide">Tags</p>
      <div class="flex flex-wrap gap-1">
        {#each tags as tag (tag)}
          <Badge variant="secondary" class="font-normal">{tag}</Badge>
        {/each}
      </div>
    </Popover.Content>
  </Popover.Root>
{/if}
