<script lang="ts">
  import * as Avatar from "$lib/components/ui/avatar/index.js";

  let {
    name,
    avatar,
    emailHint,
  }: {
    name: string | null;
    avatar: string;
    /** Used for avatar fallback when name is missing */
    emailHint: string;
  } = $props();

  const displayName = $derived(name?.trim() || "");
  const initials = $derived(
    displayName
      ? displayName.slice(0, 2).toLowerCase()
      : emailHint.slice(0, 2).toLowerCase(),
  );
  const alt = $derived(displayName || emailHint);
</script>

<div class="flex min-w-0 items-center gap-3">
  <Avatar.Root class="h-8 w-8 shrink-0">
    <Avatar.Image src={avatar} alt={alt} />
    <Avatar.Fallback class="bg-primary/10 text-primary text-xs lowercase">
      {initials}
    </Avatar.Fallback>
  </Avatar.Root>
  <span class="truncate font-medium normal-case text-foreground">
    {#if displayName}
      {displayName}
    {:else}
      <span class="text-muted-foreground">no name</span>
    {/if}
  </span>
</div>
