<script lang="ts">
  import * as Popover from "$lib/components/ui/popover/index.js";
  import { Button, buttonVariants } from "$lib/components/ui/button/index.js";
  import { invalidateAll } from "$app/navigation";
  import { page } from "$app/state";
  import { Bell, Megaphone, Info, AlertTriangle, Clock, Check } from "@lucide/svelte";
  import { cn } from "$lib/utils.js";
  import type { NotificationKind } from "$lib/types/notifications";

  let open = $state(false);

  let bell = $derived(page.data.notificationBell ?? { unreadCount: 0, preview: [] });

  function kindIcon(kind: NotificationKind) {
    switch (kind) {
      case "announcement":
        return Megaphone;
      case "information":
        return Info;
      case "alert":
        return AlertTriangle;
      case "reminder":
        return Clock;
      default:
        return Bell;
    }
  }

  function kindRing(kind: NotificationKind) {
    switch (kind) {
      case "alert":
        return "ring-destructive/25 bg-destructive/10";
      case "announcement":
        return "ring-primary/25 bg-primary/10";
      case "reminder":
        return "ring-amber-500/25 bg-amber-500/10";
      default:
        return "ring-border bg-muted/50";
    }
  }

  function formatTime(iso: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 60_000) return "Just now";
    if (diffMs < 3600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
    if (diffMs < 86400_000) return `${Math.floor(diffMs / 3600_000)}h ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  async function markAllRead() {
    if (!page.data.session?.user?.id) return;
    const fd = new FormData();
    const r = await fetch("/api/notifications/mark-all-read", { method: "POST", body: fd });
    if (r.ok) await invalidateAll();
  }

  async function markOneRead(id: string) {
    if (!page.data.session?.user?.id) return;
    const r = await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    if (r.ok) await invalidateAll();
  }
</script>

<Popover.Root bind:open>
  <Popover.Trigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="ghost"
        size="icon"
        class="relative text-muted-foreground hover:text-foreground"
      >
        <Bell class="h-6 w-6" />

        {#if bell.unreadCount > 0}
          <span class="absolute right-2 top-2 flex h-2.5 w-2.5">
            <span
              class="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75"
            ></span>
            <span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive"></span>
          </span>
        {/if}
        <span class="sr-only">Toggle notifications</span>
      </Button>
    {/snippet}
  </Popover.Trigger>

  <Popover.Content class="w-96 p-0 shadow-lg" align="end" sideOffset={8}>
    <div class="border-border flex items-center justify-between border-b px-4 py-3">
      <div class="flex items-center gap-2">
        <span class="text-lg font-bold text-foreground">Notifications</span>
        {#if bell.unreadCount > 0}
          <span
            class="bg-primary text-primary-foreground flex h-5 items-center justify-center rounded-full px-2 text-xs font-bold"
          >
            {bell.unreadCount}
          </span>
        {/if}
      </div>
      <Button
        variant="ghost"
        size="sm"
        class="text-muted-foreground h-8 gap-1.5 text-xs"
        onclick={() => void markAllRead()}
        disabled={bell.unreadCount === 0}
      >
        <Check class="h-3.5 w-3.5" />
        Mark all read
      </Button>
    </div>

    <div class="max-h-112.5 overflow-y-auto overflow-x-hidden">
      {#if bell.preview.length === 0}
        <div class="text-muted-foreground flex flex-col items-center justify-center py-10 text-center">
          <Bell class="mb-2 h-8 w-8 opacity-20" />
          <p class="text-sm font-medium">No notifications yet</p>
        </div>
      {:else}
        <div class="flex flex-col">
          {#each bell.preview as item (item.id)}
            <button
              type="button"
              class="group border-border/40 hover:bg-muted/50 relative flex w-full items-start gap-4 border-b p-4 text-left transition-colors last:border-0"
              onclick={() => {
                if (!item.readAt) void markOneRead(item.id);
              }}
            >
              {#if !item.readAt}
                <div class="bg-primary absolute left-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full"></div>
              {/if}

              <div
                class={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full ring-1 ring-inset",
                  kindRing(item.kind),
                )}
              >
                {#each [item.kind] as kind}
                  {@const Icon = kindIcon(kind)}
                  <Icon class="text-foreground h-5 w-5" />
                {/each}
              </div>

              <div class="min-w-0 flex-1 space-y-1">
                <div class="flex items-baseline justify-between gap-2">
                  <span
                    class={cn(
                      "text-base font-semibold leading-snug",
                      !item.readAt ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {item.title}
                  </span>
                  <span class="text-muted-foreground shrink-0 text-[11px] font-medium opacity-80">
                    {formatTime(item.createdAt)}
                  </span>
                </div>
                <p class="text-muted-foreground line-clamp-2 text-sm leading-relaxed">{item.body}</p>
              </div>
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <div class="border-border border-t p-2">
      <a
        href="/notifications"
        class={cn(buttonVariants({ variant: "ghost" }), "text-muted-foreground hover:text-foreground h-9 w-full")}
        onclick={() => {
          open = false;
        }}
      >
        View all notifications
      </a>
    </div>
  </Popover.Content>
</Popover.Root>
