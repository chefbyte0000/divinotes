<script lang="ts">
  import "./layout.css";
  import {
    SidebarProvider,
    SidebarTrigger,
  } from "$lib/components/ui/sidebar/index.js";
  import Sidebar from "$lib/components/layout/sidebar.svelte";
  import NotificationPopover from "$lib/components/layout/notification-popover.svelte";
  import ImpersonationBanner from "$lib/components/layout/impersonation-banner.svelte";
  import { page } from "$app/stores";

  let { children } = $props();

  let impersonationSession = $derived($page.data.session);
</script>

<SidebarProvider>
  <Sidebar />
  <main class="relative flex min-h-screen w-full flex-col bg-background">
    {#if impersonationSession?.impersonating && impersonationSession.user}
      <ImpersonationBanner
        targetEmail={impersonationSession.user.email}
        targetName={impersonationSession.user.name}
      />
    {/if}

    <!-- Mobile-first Header with Top-Right Actions -->
    <header
      class="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-md lg:px-6"
    >
      <SidebarTrigger class="-ml-2" />

      <div class="flex-1"></div>

      <div class="flex items-center gap-3">
        <!-- Drop in the new highly-designed popover component -->
        <NotificationPopover />

        <!-- Sync Status (Epic 1) -->
        <div
          class="flex items-center gap-2 rounded-full border bg-muted/30 px-3 py-1 text-xs font-medium"
        >
          <div
            class="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
          ></div>
          <span class="hidden sm:inline-block">Synced</span>
        </div>
      </div>
    </header>

    <!-- Main Workspace Area -->
    <div class="flex-1 overflow-auto p-4 lg:p-8">
      {@render children()}
    </div>
  </main>
</SidebarProvider>
