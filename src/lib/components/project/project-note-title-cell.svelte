<script lang="ts">
  let { noteId, title }: { noteId: string; title: string } = $props();

  const label = $derived(title?.trim() ? title : "Untitled note");
</script>

<a
  href="/note/{noteId}"
  class="text-primary hover:text-primary/80 font-medium underline-offset-4 hover:underline"
>
  {label}
</a>
