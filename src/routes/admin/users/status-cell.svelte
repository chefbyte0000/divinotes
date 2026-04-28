<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js";
  let { status }: { status: "Active" | "Inactive" } = $props();
</script>

<Badge
  variant={status === "Active" ? "default" : "secondary"}
  class="font-medium"
>
  {status}
</Badge>
