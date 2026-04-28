<script lang="ts">
  import type { Component } from "svelte";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";

  let {
    icon: IconComponent,
    title,
    url,
    isActive = false,
  }: {
    icon: Component<any>;
    title: string;
    url: string;
    isActive?: boolean;
  } = $props();
</script>

<Sidebar.MenuItem>
  <Sidebar.MenuButton {isActive}>
    {#snippet child({ props })}
      <a
        href={url}
        {...props}
        class="group relative flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium text-muted-foreground outline-none transition-colors duration-300 hover:text-foreground {isActive
          ? 'text-foreground'
          : ''}"
      >
        <span
          class="absolute inset-0 -z-10 rounded-lg bg-foreground/5 opacity-0 shadow-[0_4px_15px_rgba(0,0,0,0.08)] transition-all duration-300 ease-out group-hover:scale-105 group-hover:opacity-100 dark:shadow-[0_4px_15px_rgba(255,255,255,0.05)] {isActive
            ? 'scale-100 opacity-100'
            : ''}"
        ></span>

        <IconComponent class="h-4 w-4 shrink-0" />
        <span class="truncate">{title}</span>
      </a>
    {/snippet}
  </Sidebar.MenuButton>
</Sidebar.MenuItem>
