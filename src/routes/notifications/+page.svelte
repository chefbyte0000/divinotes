<script lang="ts">
  import PageHeader from "$lib/components/layout/page-header.svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import { enhance } from "$app/forms";
  import { goto, invalidateAll } from "$app/navigation";
  import { page } from "$app/state";
  import {
    Bell,
    Megaphone,
    Info,
    AlertTriangle,
    Clock,
    CheckCheck,
  } from "@lucide/svelte";
  import type { PageProps } from "./$types";
  import type { NotificationKind } from "$lib/types/notifications";

  let { data }: PageProps = $props();

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

  function kindSurface(kind: NotificationKind) {
    switch (kind) {
      case "alert":
        return "border-destructive/35 bg-destructive/10 text-foreground";
      case "announcement":
        return "border-primary/35 bg-primary/10 text-foreground";
      case "reminder":
        return "border-amber-500/35 bg-amber-500/10 text-foreground";
      default:
        return "border-border bg-muted/40 text-foreground";
    }
  }

  function setFilter(next: "all" | "unread") {
    const sp = new URLSearchParams(page.url.searchParams);
    if (next === "all") {
      sp.delete("filter");
    } else {
      sp.set("filter", "unread");
    }
    sp.delete("page");
    const q = sp.toString();
    void goto(q ? `${page.url.pathname}?${q}` : page.url.pathname, {
      replaceState: true,
      keepFocus: true,
      noScroll: true,
    });
  }

  function formatTime(iso: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const totalPages = $derived(Math.max(1, Math.ceil(data.total / data.pageSize)));
</script>

<div class="mx-auto flex min-h-0 w-full max-w-3xl flex-col gap-6">
  <PageHeader
    title="Notifications"
    subtitle="System messages from your workspace administrators. Unread items also appear in the header bell."
  >
    {#snippet children()}
      <form
        method="POST"
        action="?/markAllRead"
        use:enhance={() => async ({ update }) => {
          await update();
          await invalidateAll();
        }}
      >
        <Button type="submit" variant="outline" size="sm" disabled={data.unreadCount === 0}>
          <CheckCheck class="mr-1.5 size-4" />
          Mark all read
        </Button>
      </form>
    {/snippet}
  </PageHeader>

  <div
    role="tablist"
    aria-label="Inbox filter"
    class="border-border bg-muted/35 inline-flex gap-0.5 self-start rounded-xl border p-1"
  >
    <button
      type="button"
      role="tab"
      aria-selected={!data.unreadOnly}
      class="rounded-lg px-4 py-2 text-sm font-medium transition-colors {!data.unreadOnly
        ? 'bg-background text-foreground shadow-sm'
        : 'text-muted-foreground hover:text-foreground'}"
      onclick={() => setFilter("all")}
    >
      All
    </button>
    <button
      type="button"
      role="tab"
      aria-selected={data.unreadOnly}
      class="rounded-lg px-4 py-2 text-sm font-medium transition-colors {data.unreadOnly
        ? 'bg-background text-foreground shadow-sm'
        : 'text-muted-foreground hover:text-foreground'}"
      onclick={() => setFilter("unread")}
    >
      Unread {#if data.unreadCount > 0}({data.unreadCount}){/if}
    </button>
  </div>

  {#if data.items.length === 0}
    <div
      class="border-border bg-card/50 text-muted-foreground flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-16 text-center text-sm"
    >
      <Bell class="mb-3 size-10 opacity-25" />
      <p class="text-foreground font-medium">You are all caught up</p>
      <p class="mt-1 max-w-sm">No notifications in this view.</p>
    </div>
  {:else}
    <ul class="flex flex-col gap-2">
      {#each data.items as n (n.id)}
        <li>
          <div
            class="border-border bg-card flex gap-4 rounded-2xl border p-4 shadow-sm transition-colors {!n.readAt
              ? 'ring-primary/20 ring-1'
              : ''}"
          >
            <div
              class="flex size-11 shrink-0 items-center justify-center rounded-full border {kindSurface(
                n.kind,
              )}"
            >
              {#each [n.kind] as kind}
                {@const Icon = kindIcon(kind)}
                <Icon class="size-5 shrink-0" />
              {/each}
            </div>
            <div class="min-w-0 flex-1 space-y-1">
              <div class="flex flex-wrap items-baseline justify-between gap-2">
                <h2 class="text-foreground text-base font-semibold leading-snug">{n.title}</h2>
                <span class="text-muted-foreground shrink-0 text-xs font-medium">{formatTime(n.createdAt)}</span>
              </div>
              <p class="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">{n.body}</p>
              <div class="text-muted-foreground flex flex-wrap items-center gap-2 pt-1 text-xs uppercase tracking-wide">
                <span>{n.kind}</span>
                {#if !n.readAt}
                  <form
                    method="POST"
                    action="?/markRead"
                    use:enhance={() => async ({ update }) => {
                      await update();
                      await invalidateAll();
                    }}
                    class="inline"
                  >
                    <input type="hidden" name="notificationId" value={n.id} />
                    <button
                      type="submit"
                      class="text-primary hover:text-primary/80 font-medium normal-case underline-offset-4 hover:underline"
                    >
                      Mark read
                    </button>
                  </form>
                {:else}
                  <span class="normal-case opacity-70">Read</span>
                {/if}
              </div>
            </div>
          </div>
        </li>
      {/each}
    </ul>

    {#if totalPages > 1}
      <div class="text-muted-foreground flex items-center justify-between gap-3 text-sm">
        <span>Page {data.page} of {totalPages}</span>
        <div class="flex gap-2">
          {#if data.page > 1}
            <Button
              variant="outline"
              size="sm"
              href="?{new URLSearchParams({
                ...(data.unreadOnly ? { filter: 'unread' } : {}),
                page: String(data.page - 1),
              }).toString()}"
            >
              Previous
            </Button>
          {/if}
          {#if data.page < totalPages}
            <Button
              variant="outline"
              size="sm"
              href="?{new URLSearchParams({
                ...(data.unreadOnly ? { filter: 'unread' } : {}),
                page: String(data.page + 1),
              }).toString()}"
            >
              Next
            </Button>
          {/if}
        </div>
      </div>
    {/if}
  {/if}
</div>
