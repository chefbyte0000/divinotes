<script lang="ts">
  import { page } from "$app/stores";
  import { LayoutDashboard, FolderRoot, Settings, Plus } from "@lucide/svelte";
  import { cn } from "$lib/utils";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { Separator } from "$lib/components/ui/separator";
  import { Button } from "$lib/components/ui/button";

  let { class: className } = $props();

  const navItems = [
    { name: "General", href: "/", icon: LayoutDashboard },
    { name: "Projects", href: "/projects", icon: FolderRoot },
  ];
</script>

<aside class={cn("flex h-full flex-col border-r bg-card px-3 py-4", className)}>
  <div class="mb-6 flex items-center justify-between px-2">
    <span class="text-xl font-bold tracking-tight text-primary">DiviNotes</span>
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <Button variant="outline" size="icon" class="size-8" href="/new">
          <Plus class="size-4" />
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Content>New Note</Tooltip.Content>
    </Tooltip.Root>
  </div>

  <nav class="flex flex-1 flex-col gap-2">
    {#each navItems as item}
      <Button
        variant={$page.url.pathname === item.href ? "secondary" : "ghost"}
        href={item.href}
        class="justify-start gap-3"
      >
        <item.icon class="size-4" />
        {item.name}
      </Button>
    {/each}

    <Separator class="my-2" />

    <div
      class="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
    >
      Recent Projects
    </div>
    <!-- This will be dynamic later -->
    <Button variant="ghost" class="justify-start gap-3 font-normal italic">
      No projects yet...
    </Button>
  </nav>

  <div class="mt-auto flex flex-col gap-2">
    <Separator class="mb-2" />
    <Button variant="ghost" class="justify-start gap-3">
      <Settings class="size-4" />
      Settings
    </Button>
  </div>
</aside>
