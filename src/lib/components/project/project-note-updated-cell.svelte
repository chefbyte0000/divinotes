<script lang="ts">
  let { updatedAt }: { updatedAt: string | Date } = $props();

  function fmt(u: string | Date) {
    const d = u instanceof Date ? u : new Date(u);
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }
</script>

<span class="text-muted-foreground tabular-nums">{fmt(updatedAt)}</span>
