<script lang="ts">
  import * as Popover from "$lib/components/ui/popover/index.js";
  import * as Command from "$lib/components/ui/command/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { cn } from "$lib/utils.js";
  import { Check, ChevronsUpDown } from "@lucide/svelte";

  interface Props {
    value?: string;
    options: string[];
    placeholder?: string;
    onSelect?: (value: string) => void;
  }

  let {
    value = "",
    options = [],
    placeholder = "Select...",
    onSelect,
  }: Props = $props();

  let open = $state(false);
  let searchQuery = $state("");

  const filteredOptions = $derived(
    options.filter((option) =>
      option.toLowerCase().includes(searchQuery.toLowerCase()),
    ),
  );

  function handleSelect(selectedValue: string) {
    onSelect?.(selectedValue);
    open = false;
  }
</script>

<Popover.Root bind:open>
  <Popover.Trigger asChild let:builder>
    <Button
      builders={[builder]}
      variant="outline"
      role="combobox"
      aria-expanded={open}
      class="w-full justify-between"
    >
      <span class={cn(!value && "text-muted-foreground")}>
        {value || placeholder}
      </span>
      <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
    </Button>
  </Popover.Trigger>
  <Popover.Content class="w-[var(--rct-anchor-width)] p-0">
    <Command.Root shouldFilter={false}>
      <Command.Input {placeholder} bind:value={searchQuery} class="h-9" />
      <Command.Empty>No option found.</Command.Empty>
      <Command.List>
        {#each filteredOptions as option (option)}
          <Command.Item value={option} onSelect={() => handleSelect(option)}>
            <Check
              class={cn(
                "mr-2 h-4 w-4",
                value === option ? "opacity-100" : "opacity-0",
              )}
            />
            {option}
          </Command.Item>
        {/each}
      </Command.List>
    </Command.Root>
  </Popover.Content>
</Popover.Root>
