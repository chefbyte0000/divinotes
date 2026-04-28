<script lang="ts">
  import { Checkbox } from "$lib/components/ui/checkbox/index.js";

  let {
    checked,
    onCheckedChange,
    ariaLabel,
  }: {
    checked: boolean | "indeterminate";
    onCheckedChange: (v: boolean) => void;
    ariaLabel: string;
  } = $props();
</script>

<Checkbox
  checked={checked as any}
  {onCheckedChange}
  aria-label={ariaLabel}
  class="translate-y-[2px]"
/>
