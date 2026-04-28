<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { cn } from "$lib/utils.js";

  let { status }: { status: "active" | "pending" } = $props();

  const title = $derived(
    status === "active"
      ? "Email verified — this account has confirmed its email address."
      : "Pending — this user has not verified their email yet.",
  );
</script>

<Badge
  variant="outline"
  class={cn(
    "cursor-help border font-medium lowercase",
    status === "active" &&
      "border-emerald-500/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
    status === "pending" &&
      "border-amber-500/35 bg-amber-500/10 text-amber-900 dark:text-amber-200",
  )}
  {title}
>
  {status}
</Badge>
