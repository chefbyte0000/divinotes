<script lang="ts">
  import type { Editor } from "@tiptap/core";
  import type { InitProgressReport } from "@mlc-ai/web-llm";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { detectWebGpu } from "$lib/ai/webgpu-detector";
  import { jsonContentToPlainText } from "$lib/tiptap/json-content-to-plain-text";
  import { markdownToSafeHtml } from "$lib/tiptap/markdown-paste";
  import {
    generateNoteOrganizeQuestions,
    organizeNoteWithAnswers,
    type OrganizeNoteAnswer,
    type OrganizeNoteQuestion,
  } from "$lib/ai/note-organize-ai";
  import { Layers, LoaderCircle, CornerDownLeft } from "@lucide/svelte";

  let {
    editor,
    noteTitle = "",
    hideTrigger = false,
    launchToken = 0,
    open = $bindable(false),
  }: {
    editor: Editor;
    noteTitle?: string;
    hideTrigger?: boolean;
    launchToken?: number;
    open?: boolean;
  } = $props();

  let lastLaunchToken = $state(0);
  let phase = $state<"idle" | "questions" | "running" | "done" | "error">("idle");
  let errorMessage = $state<string | null>(null);
  let modelHint = $state("");
  let questions = $state<OrganizeNoteQuestion[]>([]);
  let questionIndex = $state(0);
  let selectedOptionByQuestion = $state<Record<string, string>>({});
  let customEnabledByQuestion = $state<Record<string, boolean>>({});
  let customTextByQuestion = $state<Record<string, string>>({});
  let organizedMarkdown = $state("");
  let abort: AbortController | null = null;

  function reset() {
    phase = "idle";
    errorMessage = null;
    modelHint = "";
    questions = [];
    questionIndex = 0;
    selectedOptionByQuestion = {};
    customEnabledByQuestion = {};
    customTextByQuestion = {};
    organizedMarkdown = "";
    abort?.abort();
    abort = null;
  }

  $effect(() => {
    if (!open) reset();
  });

  $effect(() => {
    if (!hideTrigger) return;
    if (launchToken <= lastLaunchToken) return;
    lastLaunchToken = launchToken;
    void runQuestionStep();
  });

  function setDefaults(qs: OrganizeNoteQuestion[]) {
    const selected: Record<string, string> = {};
    const customFlag: Record<string, boolean> = {};
    const customText: Record<string, string> = {};
    for (const q of qs) {
      const suggested = q.options.find((o) => o.suggested) ?? q.options[0];
      selected[q.id] = suggested?.id ?? "";
      customFlag[q.id] = false;
      customText[q.id] = "";
    }
    selectedOptionByQuestion = selected;
    customEnabledByQuestion = customFlag;
    customTextByQuestion = customText;
    questionIndex = 0;
  }

  function collectAnswers(): OrganizeNoteAnswer[] {
    const out: OrganizeNoteAnswer[] = [];
    for (const q of questions) {
      if (customEnabledByQuestion[q.id]) {
        const custom = (customTextByQuestion[q.id] ?? "").trim();
        if (custom) out.push({ questionId: q.id, answer: custom });
        continue;
      }
      const optId = selectedOptionByQuestion[q.id];
      const opt = q.options.find((o) => o.id === optId) ?? q.options.find((o) => o.suggested) ?? q.options[0];
      if (opt) out.push({ questionId: q.id, answer: opt.label });
    }
    return out;
  }

  async function runQuestionStep() {
    abort?.abort();
    abort = new AbortController();
    const signal = abort.signal;
    phase = "running";
    errorMessage = null;
    modelHint = "";
    organizedMarkdown = "";
    open = true;

    const plain = jsonContentToPlainText(editor.getJSON()).trim();
    if (!plain) {
      phase = "error";
      errorMessage = "This note has no text to organize yet.";
      return;
    }

    const gpu = await detectWebGpu();
    if (!gpu.ok) {
      phase = "error";
      errorMessage = `${gpu.title}: ${gpu.description}`;
      return;
    }

    const onModelProgress = (r: InitProgressReport) => {
      const t = typeof (r as { text?: unknown }).text === "string" ? (r as { text: string }).text : "";
      if (t) modelHint = t;
    };

    try {
      const qs = await generateNoteOrganizeQuestions({
        noteTitle,
        plainText: plain,
        signal,
        onModelProgress,
      });
      if (signal.aborted) return;
      questions = qs;
      setDefaults(qs);
      phase = "questions";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      phase = "error";
      errorMessage = e instanceof Error ? e.message : String(e);
    }
  }

  async function runOrganize() {
    abort?.abort();
    abort = new AbortController();
    const signal = abort.signal;
    phase = "running";
    errorMessage = null;
    modelHint = "";
    organizedMarkdown = "";

    const plain = jsonContentToPlainText(editor.getJSON()).trim();
    if (!plain) {
      phase = "error";
      errorMessage = "This note has no text to organize yet.";
      return;
    }

    const onModelProgress = (r: InitProgressReport) => {
      const t = typeof (r as { text?: unknown }).text === "string" ? (r as { text: string }).text : "";
      if (t) modelHint = t;
    };

    try {
      organizedMarkdown = await organizeNoteWithAnswers({
        noteTitle,
        plainText: plain,
        answers: collectAnswers(),
        signal,
        onModelProgress,
        onToken: (_d, full) => {
          organizedMarkdown = full;
        },
      });
      phase = "done";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        phase = "questions";
        return;
      }
      const msg = e instanceof Error ? e.message : String(e);
      if (questions.length > 0) {
        phase = "questions";
        errorMessage = msg;
      } else {
        phase = "error";
        errorMessage = msg;
      }
    }
  }

  function replaceNote() {
    if (!organizedMarkdown.trim()) return;
    const safe = markdownToSafeHtml(organizedMarkdown.trim());
    editor.commands.setContent(safe, { emitUpdate: true });
    open = false;
  }

  let activeQuestion = $derived(questions[questionIndex] ?? null);
  let isFirstStep = $derived(questionIndex <= 0);
  let isLastStep = $derived(questions.length > 0 && questionIndex >= questions.length - 1);
</script>

<span class="contents inline-flex">
  {#if !hideTrigger}
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      class="size-8 shrink-0"
      title="Organize note (local AI)"
      disabled={open}
      onclick={() => void runQuestionStep()}
    >
      <Layers class="size-4" />
    </Button>
  {/if}

  <Dialog.Root bind:open>
    <Dialog.Content
      class={`!max-w-[min(96vw,540px)] flex w-full max-w-[min(96vw,540px)] flex-col gap-0 overflow-hidden p-0 sm:!max-w-[540px] ${
        phase === "questions" || phase === "done" || phase === "running"
          ? "max-h-[min(88vh,620px)] min-h-[320px]"
          : "max-h-[min(90vh,560px)]"
      }`}
    >
      <Dialog.Header class="border-border shrink-0 space-y-2 border-b px-5 py-4">
        <Dialog.Title class="flex items-center gap-2 text-base font-semibold tracking-tight">
          <Layers class="text-primary size-4 shrink-0" />
          Organize note
        </Dialog.Title>
        <Dialog.Description class="text-muted-foreground text-sm leading-snug">
          Answer three short questions in order, then get a cleaner Markdown draft of this note—same substance, clearer structure.
        </Dialog.Description>
        {#if phase === "questions" && questions.length > 0}
          <div class="flex gap-2 pt-1" aria-label="Question steps">
            {#each questions as _q, i (_q.id)}
              <div class="flex min-w-0 flex-1 flex-col gap-1">
                <div
                  class="h-1 rounded-full transition-colors {i <= questionIndex ? 'bg-primary' : 'bg-muted'}"
                  title="Step {i + 1}"
                ></div>
                <span class="text-muted-foreground text-center text-[10px] font-medium tabular-nums">
                  {i + 1} / {questions.length}
                </span>
              </div>
            {/each}
          </div>
        {/if}
      </Dialog.Header>

      <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {#if phase === "questions" && errorMessage}
          <p class="bg-destructive/10 text-destructive border-destructive/20 mb-3 rounded-lg border px-3 py-2 text-sm" role="alert">
            {errorMessage}
          </p>
        {/if}
        {#if phase === "running"}
          <p class="text-muted-foreground flex items-center gap-2 text-sm">
            <LoaderCircle class="size-4 shrink-0 animate-spin" />
            {modelHint || "Running local model…"}
          </p>
        {:else if phase === "questions" && activeQuestion}
          <div class="border-border bg-card mx-auto max-w-full space-y-4 rounded-xl border p-4 shadow-sm sm:p-5">
            <div class="flex items-baseline justify-between gap-2">
              <p class="text-muted-foreground text-xs font-medium tracking-wide uppercase">Step {questionIndex + 1}</p>
            </div>
            <p class="text-foreground text-base leading-snug font-medium break-words">
              {activeQuestion.prompt}
            </p>
            <div class="flex flex-col gap-2">
              {#each activeQuestion.options as opt (opt.id)}
                <button
                  type="button"
                  class="border-border bg-background hover:bg-accent/80 text-left text-sm leading-snug break-words rounded-lg border px-3 py-2.5 transition-colors"
                  class:border-primary={!customEnabledByQuestion[activeQuestion.id] &&
                    selectedOptionByQuestion[activeQuestion.id] === opt.id}
                  class:ring-2={!customEnabledByQuestion[activeQuestion.id] &&
                    selectedOptionByQuestion[activeQuestion.id] === opt.id}
                  class:ring-primary={!customEnabledByQuestion[activeQuestion.id] &&
                    selectedOptionByQuestion[activeQuestion.id] === opt.id}
                  class:bg-accent={!customEnabledByQuestion[activeQuestion.id] &&
                    selectedOptionByQuestion[activeQuestion.id] === opt.id}
                  onclick={() => {
                    selectedOptionByQuestion = {
                      ...selectedOptionByQuestion,
                      [activeQuestion.id]: opt.id,
                    };
                    customEnabledByQuestion = { ...customEnabledByQuestion, [activeQuestion.id]: false };
                  }}
                >
                  {opt.label}{#if opt.suggested}<span class="text-muted-foreground font-normal"> · default</span>{/if}
                </button>
              {/each}
            </div>
            <div class="border-border space-y-2 border-t pt-4">
              <Button
                type="button"
                size="sm"
                variant={customEnabledByQuestion[activeQuestion.id] ? "default" : "outline"}
                class="w-full sm:w-auto"
                onclick={() => {
                  customEnabledByQuestion = {
                    ...customEnabledByQuestion,
                    [activeQuestion.id]: !customEnabledByQuestion[activeQuestion.id],
                  };
                }}
              >
                Custom answer
              </Button>
              <textarea
                class="border-border bg-background min-h-[2.75rem] w-full resize-y rounded-md border px-3 py-2 text-sm focus:outline-none"
                placeholder="Optional: your own wording for this step…"
                rows="2"
                disabled={!customEnabledByQuestion[activeQuestion.id]}
                value={customTextByQuestion[activeQuestion.id] ?? ""}
                oninput={(e) => {
                  const value = (e.currentTarget as HTMLTextAreaElement).value;
                  customTextByQuestion = { ...customTextByQuestion, [activeQuestion.id]: value };
                }}
              ></textarea>
            </div>
          </div>
        {:else if phase === "done"}
          <pre
            class="border-border bg-muted/30 max-h-[min(50vh,340px)] overflow-auto rounded-lg border p-3 font-sans text-[13px] leading-relaxed whitespace-pre-wrap"
          >{organizedMarkdown}</pre>
        {:else if phase === "error" && errorMessage}
          <p class="text-destructive text-sm leading-relaxed" role="alert">{errorMessage}</p>
        {/if}
      </div>

      <Dialog.Footer
        class="border-border bg-muted/20 flex shrink-0 flex-col gap-2 border-t px-5 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end"
      >
        <div class="flex w-full flex-wrap gap-2 sm:mr-auto sm:w-auto">
          <Button type="button" variant="outline" size="sm" onclick={() => (open = false)}>Close</Button>
          {#if phase === "questions"}
            <Button type="button" variant="secondary" size="sm" onclick={() => void runQuestionStep()}>
              New questions
            </Button>
          {/if}
        </div>
        {#if phase === "idle" || phase === "error"}
          <Button type="button" size="sm" onclick={() => void runQuestionStep()}>
            Analyze note
          </Button>
        {:else if phase === "questions"}
          <div class="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isFirstStep}
              onclick={() => {
                errorMessage = null;
                questionIndex = Math.max(0, questionIndex - 1);
              }}
            >
              Back
            </Button>
            {#if !isLastStep}
              <Button
                type="button"
                size="sm"
                onclick={() => {
                  errorMessage = null;
                  questionIndex = Math.min(questions.length - 1, questionIndex + 1);
                }}
              >
                Next
              </Button>
            {:else}
              <Button type="button" size="sm" onclick={() => void runOrganize()}>Organize note</Button>
            {/if}
          </div>
        {:else if phase === "done"}
          <Button type="button" variant="secondary" size="sm" onclick={() => void runQuestionStep()}>
            Start over
          </Button>
          <Button type="button" size="sm" onclick={replaceNote}>
            <CornerDownLeft class="mr-2 size-4" />
            Replace note
          </Button>
        {/if}
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>
</span>
