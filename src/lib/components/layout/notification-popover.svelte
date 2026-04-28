<script lang="ts">
  import * as Popover from "$lib/components/ui/popover/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import {
    Bell,
    BrainCircuit,
    CheckCircle2,
    AlertCircle,
    ActivitySquare,
    Check,
  } from "@lucide/svelte";

  // Mock data reflecting your Epics (Local AI, Sync, Telemetry)
  let notifications = $state([
    {
      id: 1,
      title: "WebGPU Ready",
      description:
        "Gemma 8B has been successfully loaded into memory and is ready for offline inference.",
      time: "Just now",
      unread: true,
      icon: BrainCircuit,
      colorClass: "text-emerald-500",
      bgClass: "bg-emerald-500/10",
    },
    {
      id: 2,
      title: "Habit Detected",
      description:
        "You usually draft a 'Morning Routine' list around this time. Should I prepare one?",
      time: "2 hours ago",
      unread: true,
      icon: ActivitySquare,
      colorClass: "text-primary",
      bgClass: "bg-primary/10",
    },
    {
      id: 3,
      title: "Sync Completed",
      description:
        "All offline edits across 3 projects have been securely pushed to your cloud database.",
      time: "5 hours ago",
      unread: false,
      icon: CheckCircle2,
      colorClass: "text-blue-500",
      bgClass: "bg-blue-500/10",
    },
    {
      id: 4,
      title: "Storage Warning",
      description:
        "Local IndexedDB is approaching 80% capacity. Consider clearing older unpinned notes.",
      time: "1 day ago",
      unread: false,
      icon: AlertCircle,
      colorClass: "text-amber-500",
      bgClass: "bg-amber-500/10",
    },
  ]);

  // Reactive derived state for the red badge
  let unreadCount = $derived(notifications.filter((n) => n.unread).length);

  function markAllAsRead() {
    notifications = notifications.map((n) => ({ ...n, unread: false }));
  }
</script>

<Popover.Root>
  <Popover.Trigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="ghost"
        size="icon"
        class="relative text-muted-foreground hover:text-foreground"
      >
        <Bell class="h-6 w-6" />

        {#if unreadCount > 0}
          <!-- Pulsing dot for unread notifications -->
          <span class="absolute right-2 top-2 flex h-2.5 w-2.5">
            <span
              class="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75"
            ></span>
            <span
              class="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive"
            ></span>
          </span>
        {/if}
        <span class="sr-only">Toggle notifications</span>
      </Button>
    {/snippet}
  </Popover.Trigger>

  <!-- Using w-96 for a wide, highly legible layout -->
  <Popover.Content class="w-96 p-0 shadow-lg" align="end" sideOffset={8}>
    <!-- Header -->
    <div
      class="flex items-center justify-between border-b border-border px-4 py-3"
    >
      <div class="flex items-center gap-2">
        <span class="text-lg font-bold text-foreground">Notifications</span>
        {#if unreadCount > 0}
          <span
            class="flex h-5 items-center justify-center rounded-full bg-primary px-2 text-xs font-bold text-primary-foreground"
          >
            {unreadCount}
          </span>
        {/if}
      </div>
      <Button
        variant="ghost"
        size="sm"
        class="h-8 gap-1.5 text-xs text-muted-foreground"
        onclick={markAllAsRead}
      >
        <Check class="h-3.5 w-3.5" />
        Mark all read
      </Button>
    </div>

    <!-- Scrollable Feed -->
    <div class="max-h-112.5 overflow-y-auto overflow-x-hidden">
      {#if notifications.length === 0}
        <div
          class="flex flex-col items-center justify-center py-10 text-center text-muted-foreground"
        >
          <Bell class="mb-2 h-8 w-8 opacity-20" />
          <p class="text-sm font-medium">No new notifications</p>
        </div>
      {:else}
        <div class="flex flex-col">
          {#each notifications as item (item.id)}
            <!-- 
							Large hit areas, generous padding, and a subtle background shift on hover.
							The layout ensures text is large enough to read instantly. 
						-->
            <button
              class="group relative flex w-full items-start gap-4 border-b border-border/40 p-4 text-left transition-colors hover:bg-muted/50 last:border-0"
            >
              <!-- Unread Indicator Pip -->
              {#if item.unread}
                <div
                  class="absolute left-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-primary"
                ></div>
              {/if}

              <!-- Large Icon Container -->
              <div
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full {item.bgClass}"
              >
                <item.icon class="h-5 w-5 {item.colorClass}" />
              </div>

              <!-- Text Content -->
              <div class="flex flex-col gap-1">
                <div class="flex items-baseline justify-between gap-2">
                  <span
                    class="text-base font-semibold text-foreground {item.unread
                      ? ''
                      : 'text-muted-foreground'}"
                  >
                    {item.title}
                  </span>
                  <span
                    class="shrink-0 text-[11px] font-medium text-muted-foreground/70"
                  >
                    {item.time}
                  </span>
                </div>
                <!-- line-clamp-2 ensures the description doesn't break the layout if it gets too long -->
                <p
                  class="text-sm leading-relaxed text-muted-foreground line-clamp-2"
                >
                  {item.description}
                </p>
              </div>
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <div class="border-t border-border p-2">
      <Button
        variant="ghost"
        class="w-full text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        View all system logs
      </Button>
    </div>
  </Popover.Content>
</Popover.Root>
