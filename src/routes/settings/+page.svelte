<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import ThemeToggle from "$lib/components/layout/theme-toggle.svelte";
  import type { PageData } from "./$types";

  type SettingsTab = PageData["settingsTab"];

  let { data }: { data: PageData } = $props();

  function setTab(next: SettingsTab) {
    const sp = new URLSearchParams(page.url.searchParams);
    if (next === "general") {
      sp.delete("tab");
    } else {
      sp.set("tab", next);
    }
    const q = sp.toString();
    void goto(q ? `${page.url.pathname}?${q}` : page.url.pathname, {
      replaceState: true,
      noScroll: true,
      keepFocus: true,
    });
  }
</script>

<div class="mx-auto w-full max-w-3xl space-y-8">
  <div class="space-y-1">
    <h1 class="text-2xl font-semibold tracking-tight">Settings</h1>
    <p class="text-muted-foreground text-sm">Manage your workspace and on-device AI.</p>
  </div>

  <div
    role="tablist"
    aria-label="Settings sections"
    class="border-border bg-muted/35 inline-flex gap-0.5 rounded-xl border p-1"
  >
    <button
      type="button"
      role="tab"
      aria-selected={data.settingsTab === "general"}
      class="rounded-lg px-4 py-2 text-sm font-medium transition-colors {data.settingsTab === 'general'
        ? 'bg-background text-foreground shadow-sm'
        : 'text-muted-foreground hover:text-foreground'}"
      onclick={() => setTab("general")}
    >
      General
    </button>
    <button
      type="button"
      role="tab"
      aria-selected={data.settingsTab === "local-ai"}
      class="rounded-lg px-4 py-2 text-sm font-medium transition-colors {data.settingsTab === 'local-ai'
        ? 'bg-background text-foreground shadow-sm'
        : 'text-muted-foreground hover:text-foreground'}"
      onclick={() => setTab("local-ai")}
    >
      Local AI
    </button>
  </div>

  {#if data.settingsTab === "general"}
    <div
      role="tabpanel"
      class="border-border bg-card/60 space-y-6 rounded-xl border p-6 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.06]"
    >
      <section class="space-y-3">
        <h2 class="text-sm font-medium">Appearance</h2>
        <p class="text-muted-foreground text-sm leading-relaxed">
          Toggle light or dark mode. Your choice is saved in this browser.
        </p>
        <div class="flex items-center gap-3">
          <span class="text-muted-foreground text-sm">Theme</span>
          <ThemeToggle />
        </div>
      </section>
      <section class="border-border space-y-2 border-t pt-6">
        <h2 class="text-sm font-medium">Data</h2>
        <p class="text-muted-foreground text-sm leading-relaxed">
          Export your synced notes and manage privacy from the user menu with
          <span class="text-foreground font-medium">Data &amp; privacy</span>.
        </p>
      </section>
    </div>
  {:else}
    <div role="tabpanel" class="min-h-[12rem]">
      {#await import("$lib/components/settings/settings-local-ai-tab.svelte")}
        <div class="text-muted-foreground flex items-center gap-2 py-12 text-sm">
          <span
            class="border-primary inline-block h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
            aria-hidden="true"
          ></span>
          Loading Local AI…
        </div>
      {:then { default: LocalAiTab }}
        <LocalAiTab />
      {:catch}
        <p class="text-destructive text-sm">Could not load the Local AI panel.</p>
      {/await}
    </div>
  {/if}
</div>
