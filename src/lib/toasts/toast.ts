import { writable } from "svelte/store";

export type ToastVariant = "default" | "success" | "destructive" | "info";

export type ToastItem = { id: string; message: string; variant: ToastVariant };

function createToastStore() {
  const { subscribe, update } = writable<ToastItem[]>([]);

  function dismiss(id: string) {
    update((items) => items.filter((t) => t.id !== id));
  }

  function push(message: string, opts?: { variant?: ToastVariant; duration?: number }) {
    const id = crypto.randomUUID();
    const variant = opts?.variant ?? "default";
    const duration = opts?.duration ?? 4200;
    update((items) => [...items, { id, message, variant }]);
    setTimeout(() => dismiss(id), duration);
    return id;
  }

  return { subscribe, dismiss, push };
}

export const toastStore = createToastStore();

/** App-wide ephemeral feedback (save actions, AI ops, downloads, etc.). */
export function toast(message: string, opts?: { variant?: ToastVariant; duration?: number }) {
  return toastStore.push(message, opts);
}
