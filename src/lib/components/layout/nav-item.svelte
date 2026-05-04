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
          class="absolute inset-0 -z-10 rounded-lg bg-sidebar-accent/0 opacity-0 transition-colors duration-200 ease-out group-hover:bg-sidebar-accent/50 group-hover:opacity-100 {isActive
            ? 'bg-sidebar-accent/80 opacity-100'
            : ''}"
        ></span>

        <IconComponent class="h-4 w-4 shrink-0" />
        <span class="truncate">{title}</span>
      </a>
    {/snippet}
  </Sidebar.MenuButton>
</Sidebar.MenuItem>
