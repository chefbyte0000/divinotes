<script lang="ts">
  import * as Avatar from "$lib/components/ui/avatar/index.js";

  let { name, email, avatar }: { name: string; email: string; avatar: string } =
    $props();
</script>

<div class="flex items-center gap-3">
  <Avatar.Root class="h-8 w-8">
    <Avatar.Image src={avatar} alt={name} />
    <Avatar.Fallback class="bg-primary/10 text-primary text-xs">
      {name.substring(0, 2).toUpperCase()}
    </Avatar.Fallback>
  </Avatar.Root>
  <div class="flex flex-col">
    <span class="font-medium text-foreground">{name}</span>
    <span class="text-xs text-muted-foreground">{email}</span>
  </div>
</div>
