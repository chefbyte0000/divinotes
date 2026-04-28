<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { cn } from "$lib/utils.js";
  import { ArrowDown, ArrowUp, ChevronsUpDown } from "@lucide/svelte";
  import type { Column, Header } from "tanstack-table-8-svelte-5";
  let {
    column,
    header,
    title,
    class: className,
  }: {
    column: Column<any, unknown>;
    header: Header<any, unknown>;
    title: string;
    class?: string;
  } = $props();

  let isResizing = $state(false);

  function handleMouseDown(e: MouseEvent) {
    header.getResizeHandler()?.(e);
    isResizing = true;
  }

  function handleMouseUp() {
    isResizing = false;
  }

  function handleTouchStart(e: TouchEvent) {
    header.getResizeHandler()?.(e as any);
    isResizing = true;
  }
</script>

<svelte:document onmouseup={handleMouseUp} />

<div class={cn("flex items-center gap-2 relative group", className)}>
  {#if column.getCanSort()}
    <Button
      variant="ghost"
      size="sm"
      class="-ml-3 h-8 data-[state=open]:bg-accent"
      onclick={column.getToggleSortingHandler()}
    >
      <span>{title}</span>
      {#if column.getIsSorted() === "desc"}
        <ArrowDown class="ml-2 h-4 w-4" />
      {:else if column.getIsSorted() === "asc"}
        <ArrowUp class="ml-2 h-4 w-4" />
      {:else}
        <ChevronsUpDown class="ml-2 h-4 w-4 text-muted-foreground/50" />
      {/if}
    </Button>
  {:else}
    <span class="text-sm font-medium">{title}</span>
  {/if}

  {#if column.getCanResize()}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      role="separator"
      aria-orientation="vertical"
      class={cn(
        "absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none touch-none bg-primary/0 transition-colors",
        isResizing && "bg-primary",
        !isResizing && "hover:bg-primary/50 active:bg-primary",
      )}
      onmousedown={handleMouseDown}
      ontouchstart={handleTouchStart}
    ></div>
  {/if}
</div>
