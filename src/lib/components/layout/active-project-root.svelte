<script lang="ts">
  import { setContext } from "svelte";
  import { page } from "$app/state";
  import {
    ACTIVE_PROJECT_KEY,
    type ActiveProjectApi,
  } from "$lib/workspace/active-project-api";

  let { children } = $props();

  let activeProjectId = $state<string | null>(null);

  $effect(() => {
    const pathname = page.url.pathname;
    const match = pathname.match(/^\/project\/([^/]+)/);
    activeProjectId = match?.[1] ?? null;
  });

  const api: ActiveProjectApi = {
    get activeProjectId() {
      return activeProjectId;
    },
    aiContextDirective() {
      if (activeProjectId === null) {
        return "Workspace: General (no project id). Only use notes and links in General unless the user explicitly switches project.";
      }
      return `Workspace: project id ${activeProjectId}. Ignore notes and graph edges outside this project.`;
    },
  };

  setContext(ACTIVE_PROJECT_KEY, api);
</script>

{@render children()}
