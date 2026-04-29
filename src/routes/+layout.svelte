<script lang="ts">
  import "./layout.css";
  import { onMount } from "svelte";
  import {
    SidebarProvider,
    SidebarTrigger,
  } from "$lib/components/ui/sidebar/index.js";
  import Sidebar from "$lib/components/layout/sidebar.svelte";
  import NotificationPopover from "$lib/components/layout/notification-popover.svelte";
  import ImpersonationBanner from "$lib/components/layout/impersonation-banner.svelte";
  import HardwareWarning from "$lib/components/layout/hardware-warning.svelte";
  import ActiveProjectRoot from "$lib/components/layout/active-project-root.svelte";
  import ThemeToggle from "$lib/components/layout/theme-toggle.svelte";
  import Toaster from "$lib/components/ui/toaster.svelte";
  import { get } from "svelte/store";
  import { page } from "$app/stores";
  import { invalidateAll } from "$app/navigation";
  import { toast } from "$lib/toasts/toast";

  let { children } = $props();

  let impersonationSession = $derived($page.data.session);

  onMount(() => {
    const id = window.setInterval(async () => {
      const p = get(page);
      if (!p.data.session?.user?.id) return;
      const baseline = p.data.notificationBell?.unreadCount ?? 0;
      try {
        const r = await fetch("/api/notifications/summary");
        if (!r.ok) return;
        const j = (await r.json()) as { unreadCount: number };
        if (j.unreadCount > baseline) {
          toast("You have new notifications", { variant: "info" });
          await invalidateAll();
        }
      } catch {
        // ignore network errors while polling
      }
    }, 90_000);
    return () => window.clearInterval(id);
  });
</script>

<svelte:head>
  <!-- Apply saved theme before paint to avoid flash -->
  {@html '<script>(function(){try{var k="divinotes-theme",s=localStorage.getItem(k),r=document.documentElement;if(s==="dark")r.classList.add("dark");else if(s==="light")r.classList.remove("dark");else if(window.matchMedia("(prefers-color-scheme: dark)").matches)r.classList.add("dark");}catch(e){}})()<\/script>'}
</svelte:head>

<SidebarProvider>
  <HardwareWarning />
  <ActiveProjectRoot>
    <Sidebar />
    <main class="bg-background relative flex min-h-screen w-full flex-col">
    {#if impersonationSession?.impersonating && impersonationSession.user}
      <ImpersonationBanner
        targetEmail={impersonationSession.user.email}
        targetName={impersonationSession.user.name}
      />
    {/if}

    <!-- Mobile-first Header with Top-Right Actions -->
    <header
      class="border-border bg-background/85 sticky top-0 z-10 flex h-[3.25rem] shrink-0 items-center gap-4 border-b px-5 backdrop-blur-md md:h-14 md:px-8"
    >
      <SidebarTrigger class="-ml-2" />

      <div class="flex-1"></div>

      <div class="flex items-center gap-3">
        <NotificationPopover />
        <ThemeToggle />
      </div>
    </header>

    <!-- Main Workspace Area -->
    <div class="flex-1 overflow-auto px-5 py-8 md:px-10 md:py-10 lg:px-14 lg:py-12">
      {@render children()}
    </div>

    <Toaster />
  </main>
  </ActiveProjectRoot>
</SidebarProvider>
