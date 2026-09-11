"use client";

// Replaces sonner. Sonner's own top/bottom "offset" anchors the OPPOSITE edge
// of the toast from what the name suggests and grows in the opposite
// direction (verified empirically across many rounds of live testing — never
// documented anywhere) — a genuinely confusing implementation that kept
// producing overlap bugs no offset value could fully resolve. This is a
// small self-built replacement (same pattern as an existing sibling project's
// toast.tsx) using plain `position: fixed` + normal downward/upward CSS
// growth, which behaves exactly as intuition expects: a `top`-anchored toast
// grows down, a `bottom`-anchored one grows up, and a taller message never
// flips growth direction or clips off-screen unexpectedly.
//
// Call-site API intentionally matches sonner's (`toast.success(message)`,
// `toast.error(message)`) so every existing call site across the app needed
// no changes beyond the import source.

export type ToastKind = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

type Listener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
let idCounter = 0;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l(toasts));
}

function push(kind: ToastKind, message: string) {
  const id = ++idCounter;
  toasts = [...toasts, { id, kind, message }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, 4000);
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  listener(toasts);
  return () => listeners.delete(listener);
}

export const toast = {
  success: (message: string) => push("success", message),
  error: (message: string) => push("error", message),
  info: (message: string) => push("info", message),
  warning: (message: string) => push("warning", message),
};
