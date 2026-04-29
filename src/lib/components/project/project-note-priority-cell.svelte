<script lang="ts">
  let { priority }: { priority?: number } = $props();
</script>

{#if typeof priority === "number" && !Number.isNaN(priority)}
  <span class="tabular-nums text-sm">{priority}</span>
{:else}
  <span class="text-muted-foreground">—</span>
{/if}
