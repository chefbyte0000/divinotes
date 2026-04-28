<script lang="ts">
  let { verifiedAt }: { verifiedAt: Date | null } = $props();

  const formatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const label = $derived(
    verifiedAt ? formatter.format(verifiedAt) : null,
  );
</script>

{#if label}
  <span class="text-muted-foreground tabular-nums" title={label}>{label}</span>
{:else}
  <span class="text-muted-foreground/70">—</span>
{/if}
