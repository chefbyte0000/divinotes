<script lang="ts">
  let { content, context } = $props();
</script>

{#if typeof content === "string"}
  {content}
{:else if typeof content === "function"}
  {@const result = content(context)}
  {#if typeof result === "string"}
    {result}
  {:else if result && typeof result === "object" && result.component}
    <result.component {...result.props} {context} />
  {/if}
{:else if typeof content === "object" && content !== null && content.component}
  <content.component {...content.props} {context} />
{/if}
