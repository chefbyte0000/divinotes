<script lang="ts">
  import type { Editor } from "@tiptap/core";
  import { Button } from "$lib/components/ui/button/index.js";
  import NoteSummarizeTrigger from "$lib/components/editor/note-summarize-trigger.svelte";
  import {
    AlignCenter,
    AlignLeft,
    AlignRight,
    Bold,
    Code,
    Heading1,
    Heading2,
    Heading3,
    Highlighter,
    Italic,
    Link as LinkIcon,
    List,
    ListOrdered,
    ListTodo,
    Minus,
    Quote,
    Redo2,
    Strikethrough,
    Underline,
    Undo2,
  } from "@lucide/svelte";

  let {
    editor,
    noteTitle = "",
  }: {
    editor: Editor;
    /** Passed to local AI summarize for context */
    noteTitle?: string;
  } = $props();

  /** Bump so `$derived` toolbar states refresh on transactions */
  let tick = $state(0);

  $effect(() => {
    const onChange = () => {
      tick += 1;
    };
    editor.on("transaction", onChange);
    editor.on("selectionUpdate", onChange);
    return () => {
      editor.off("transaction", onChange);
      editor.off("selectionUpdate", onChange);
    };
  });

  let _refresh = $derived(tick);

  function active(fn: () => boolean) {
    void _refresh;
    return fn();
  }

  function setLink() {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }
</script>

<div
  class="border-border bg-muted/30 flex flex-wrap items-center gap-0.5 border-b px-2 py-2 md:px-2.5"
  role="toolbar"
  aria-label="Formatting"
>
  <Button
    type="button"
    variant="ghost"
    size="icon-sm"
    class="size-8 shrink-0"
    onclick={() => editor.chain().focus().undo().run()}
    disabled={!editor.can().undo()}
    title="Undo (⌘Z)"
  >
    <Undo2 class="size-4" />
  </Button>
  <Button
    type="button"
    variant="ghost"
    size="icon-sm"
    class="size-8 shrink-0"
    onclick={() => editor.chain().focus().redo().run()}
    disabled={!editor.can().redo()}
    title="Redo (⌘⇧Z)"
  >
    <Redo2 class="size-4" />
  </Button>

  <span class="bg-border mx-1 inline-block h-6 w-px shrink-0 opacity-80" aria-hidden="true"></span>

  <Button
    type="button"
    variant={active(() => editor.isActive("bold")) ? "secondary" : "ghost"}
    size="icon-sm"
    class="size-8 shrink-0"
    onclick={() => editor.chain().focus().toggleBold().run()}
    title="Bold"
  >
    <Bold class="size-4" />
  </Button>
  <Button
    type="button"
    variant={active(() => editor.isActive("italic")) ? "secondary" : "ghost"}
    size="icon-sm"
    class="size-8 shrink-0"
    onclick={() => editor.chain().focus().toggleItalic().run()}
    title="Italic"
  >
    <Italic class="size-4" />
  </Button>
  <Button
    type="button"
    variant={active(() => editor.isActive("strike")) ? "secondary" : "ghost"}
    size="icon-sm"
    class="size-8 shrink-0"
    onclick={() => editor.chain().focus().toggleStrike().run()}
    title="Strikethrough"
  >
    <Strikethrough class="size-4" />
  </Button>
  <Button
    type="button"
    variant={active(() => editor.isActive("underline")) ? "secondary" : "ghost"}
    size="icon-sm"
    class="size-8 shrink-0"
    onclick={() => editor.chain().focus().toggleUnderline().run()}
    title="Underline"
  >
    <Underline class="size-4" />
  </Button>
  <Button
    type="button"
    variant={active(() => editor.isActive("code")) ? "secondary" : "ghost"}
    size="icon-sm"
    class="size-8 shrink-0"
    onclick={() => editor.chain().focus().toggleCode().run()}
    title="Inline code"
  >
    <Code class="size-4" />
  </Button>
  <Button
    type="button"
    variant={active(() => editor.isActive("highlight")) ? "secondary" : "ghost"}
    size="icon-sm"
    class="size-8 shrink-0"
    onclick={() => editor.chain().focus().toggleHighlight().run()}
    title="Highlight"
  >
    <Highlighter class="size-4" />
  </Button>

  <span class="bg-border mx-1 inline-block h-6 w-px shrink-0 opacity-80" aria-hidden="true"></span>

  <Button
    type="button"
    variant={active(() => editor.isActive("heading", { level: 1 })) ? "secondary" : "ghost"}
    size="icon-sm"
    class="size-8 shrink-0"
    onclick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
    title="Heading 1"
  >
    <Heading1 class="size-4" />
  </Button>
  <Button
    type="button"
    variant={active(() => editor.isActive("heading", { level: 2 })) ? "secondary" : "ghost"}
    size="icon-sm"
    class="size-8 shrink-0"
    onclick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
    title="Heading 2"
  >
    <Heading2 class="size-4" />
  </Button>
  <Button
    type="button"
    variant={active(() => editor.isActive("heading", { level: 3 })) ? "secondary" : "ghost"}
    size="icon-sm"
    class="size-8 shrink-0"
    onclick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
    title="Heading 3"
  >
    <Heading3 class="size-4" />
  </Button>

  <span class="bg-border mx-1 inline-block h-6 w-px shrink-0 opacity-80" aria-hidden="true"></span>

  <Button
    type="button"
    variant={active(() => editor.isActive("bulletList")) ? "secondary" : "ghost"}
    size="icon-sm"
    class="size-8 shrink-0"
    onclick={() => editor.chain().focus().toggleBulletList().run()}
    title="Bullet list"
  >
    <List class="size-4" />
  </Button>
  <Button
    type="button"
    variant={active(() => editor.isActive("orderedList")) ? "secondary" : "ghost"}
    size="icon-sm"
    class="size-8 shrink-0"
    onclick={() => editor.chain().focus().toggleOrderedList().run()}
    title="Numbered list"
  >
    <ListOrdered class="size-4" />
  </Button>
  <Button
    type="button"
    variant={active(() => editor.isActive("taskList")) ? "secondary" : "ghost"}
    size="icon-sm"
    class="size-8 shrink-0"
    onclick={() => editor.chain().focus().toggleTaskList().run()}
    title="Task list"
  >
    <ListTodo class="size-4" />
  </Button>
  <Button
    type="button"
    variant={active(() => editor.isActive("blockquote")) ? "secondary" : "ghost"}
    size="icon-sm"
    class="size-8 shrink-0"
    onclick={() => editor.chain().focus().toggleBlockquote().run()}
    title="Quote"
  >
    <Quote class="size-4" />
  </Button>
  <Button
    type="button"
    variant={active(() => editor.isActive("codeBlock")) ? "secondary" : "ghost"}
    size="icon-sm"
    class="size-8 shrink-0"
    onclick={() => editor.chain().focus().toggleCodeBlock().run()}
    title="Code block"
  >
    <span class="font-mono text-xs font-semibold">&lt;/&gt;</span>
  </Button>
  <Button
    type="button"
    variant="ghost"
    size="icon-sm"
    class="size-8 shrink-0"
    onclick={() => editor.chain().focus().setHorizontalRule().run()}
    title="Divider"
  >
    <Minus class="size-4" />
  </Button>

  <span class="bg-border mx-1 inline-block h-6 w-px shrink-0 opacity-80" aria-hidden="true"></span>

  <Button
    type="button"
    variant={active(() => editor.isActive({ textAlign: "left" })) ? "secondary" : "ghost"}
    size="icon-sm"
    class="size-8 shrink-0"
    onclick={() => editor.chain().focus().setTextAlign("left").run()}
    title="Align left"
  >
    <AlignLeft class="size-4" />
  </Button>
  <Button
    type="button"
    variant={active(() => editor.isActive({ textAlign: "center" })) ? "secondary" : "ghost"}
    size="icon-sm"
    class="size-8 shrink-0"
    onclick={() => editor.chain().focus().setTextAlign("center").run()}
    title="Align center"
  >
    <AlignCenter class="size-4" />
  </Button>
  <Button
    type="button"
    variant={active(() => editor.isActive({ textAlign: "right" })) ? "secondary" : "ghost"}
    size="icon-sm"
    class="size-8 shrink-0"
    onclick={() => editor.chain().focus().setTextAlign("right").run()}
    title="Align right"
  >
    <AlignRight class="size-4" />
  </Button>

  <span class="bg-border mx-1 inline-block h-6 w-px shrink-0 opacity-80" aria-hidden="true"></span>

  <Button
    type="button"
    variant={active(() => editor.isActive("link")) ? "secondary" : "ghost"}
    size="icon-sm"
    class="size-8 shrink-0"
    onclick={() => setLink()}
    title="Link"
  >
    <LinkIcon class="size-4" />
  </Button>

  <span class="bg-border mx-1 inline-block h-6 w-px shrink-0 opacity-80" aria-hidden="true"></span>

  <NoteSummarizeTrigger {editor} {noteTitle} />
</div>
