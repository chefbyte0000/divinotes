<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { Orbit } from "@lucide/svelte";
</script>

<div class="flex min-h-screen items-center justify-center bg-background px-4">
  <div
    class="w-full max-w-sm space-y-6 rounded-2xl border border-border bg-card p-8 shadow-lg"
  >
    <div class="flex flex-col items-center space-y-3 text-center">
      <div
        class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-md"
      >
        <Orbit class="h-7 w-7 text-primary-foreground" />
      </div>
      <h1 class="text-2xl font-bold tracking-tight">Sign in to Divinotion</h1>
      <p class="text-sm text-muted-foreground">
        Your local-first workspace awaits.
      </p>
    </div>

    <form action="/auth/signin/github" method="POST">
      <Button
        type="submit"
        class="w-full gap-2 py-6 text-base"
        variant="default"
      >
        <!-- Standard GitHub SVG customized to match Lucide's 24x24 viewBox stroke proportions -->
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path
            d="M15 22v-4a4.8 4.8 0 0 0-1-3.2c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"
          ></path>
          <path d="M9 18c-4.51 2-5-2-7-2"></path>
        </svg>
        Continue with GitHub
      </Button>
    </form>

    <p class="text-center text-xs text-muted-foreground">
      By continuing, you agree to our Terms of Service and Privacy Policy.
    </p>
  </div>
</div>
