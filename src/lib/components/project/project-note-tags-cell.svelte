<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js";

  let { tags }: { tags: string[] } = $props();
</script>

{#if tags.length === 0}
  <span class="text-muted-foreground">—</span>
{:else}
  <div class="flex flex-wrap gap-1">
    {#each tags as tag (tag)}
      <Badge variant="secondary" class="font-normal">{tag}</Badge>
    {/each}
  </div>
{/if}
