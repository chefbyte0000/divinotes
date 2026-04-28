<script lang="ts">
  let { email }: { email: string } = $props();
</script>

<a
  href="mailto:{email}"
  class="text-muted-foreground hover:text-foreground truncate underline-offset-2 transition-colors hover:underline"
>
  {email}
</a>
