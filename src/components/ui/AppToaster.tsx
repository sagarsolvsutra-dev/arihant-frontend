"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { dismissToast, subscribeToasts, ToastItem } from "@/lib/toast";

type ToastConfig = { anchor: "top" | "bottom"; px: number };

// List pages: only the 64px header is fixed — anchor from the top with
// enough clearance that it doesn't sit under the header, and let it grow
// downward like any normal fixed-position element.
export const LIST_PAGE_CONFIG: ToastConfig = { anchor: "top", px: 80 };

// FormToolbar pages stack TWO fixed bars — the 64px main header, then
// FormToolbar's own 64px Save/Cancel bar right below it (fixed top-16 h-16)
// — so the toast needs to clear both (128px) before it can anchor from the
// top without sitting under the Save button. Anchored top, not bottom, to
// match the list-page style; the extra clearance (vs. list pages' 80px) is
// the only difference.
export const FORM_TOOLBAR_CONFIG: ToastConfig = { anchor: "top", px: 140 };

const ICONS: Record<ToastItem["kind"], React.ElementType> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const TONE: Record<ToastItem["kind"], string> = {
  success: "border-green-200 bg-green-50 text-green-800",
  error: "border-red-200 bg-red-50 text-red-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
  warning: "border-yellow-200 bg-yellow-50 text-yellow-800",
};

const ICON_TONE: Record<ToastItem["kind"], string> = {
  success: "text-green-500",
  error: "text-red-500",
  info: "text-blue-500",
  warning: "text-yellow-500",
};

export function AppToaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const [config, setConfig] = useState<ToastConfig>(LIST_PAGE_CONFIG);

  useEffect(() => subscribeToasts(setItems), []);

  useEffect(() => {
    // FormToolbar dispatches this on mount/unmount so the one global toaster
    // can react to which page type is currently on screen (see AppToaster.tsx
    // usage in FormToolbar.tsx).
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ToastConfig>).detail;
      setConfig(detail ?? LIST_PAGE_CONFIG);
    };
    window.addEventListener("toast-config-change", handler);
    return () => window.removeEventListener("toast-config-change", handler);
  }, []);

  return (
    <div
      className="pointer-events-none fixed right-4 z-[100] flex w-full max-w-sm flex-col gap-2"
      style={{ [config.anchor]: `${config.px}px` } as React.CSSProperties}
    >
      {items.map((t) => {
        const Icon = ICONS[t.kind];
        return (
          <div
            key={t.id}
            role="alert"
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border bg-white px-4 py-3 text-sm shadow-xl ${TONE[t.kind]}`}
          >
            <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${ICON_TONE[t.kind]}`} />
            <div className="min-w-0 flex-1 font-medium">{t.message}</div>
            <button
              onClick={() => dismissToast(t.id)}
              className="shrink-0 rounded p-0.5 text-gray-400 transition hover:text-gray-700"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
