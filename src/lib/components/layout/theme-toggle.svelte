<script lang="ts">
  import { browser } from "$app/environment";
  import { Moon, Sun } from "@lucide/svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import { onMount } from "svelte";

  const KEY = "divinotes-theme";

  let dark = $state(false);

  function readDom() {
    if (!browser) return false;
    return document.documentElement.classList.contains("dark");
  }

  onMount(() => {
    dark = readDom();
  });

  function toggle() {
    dark = !dark;
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem(KEY, dark ? "dark" : "light");
  }
</script>

<Button
  type="button"
  variant="outline"
  size="icon-sm"
  class="border-border bg-background/80 text-foreground size-9 shrink-0 shadow-sm backdrop-blur-sm"
  onclick={toggle}
  title={dark ? "Light mode" : "Dark mode"}
>
  {#if dark}
    <Sun class="size-[1.05rem]" />
  {:else}
    <Moon class="size-[1.05rem]" />
  {/if}
</Button>
