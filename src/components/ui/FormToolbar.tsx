"use client";

import React, { useEffect } from "react";
import { Save, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FORM_TOOLBAR_CONFIG, LIST_PAGE_CONFIG } from "@/components/ui/AppToaster";

interface FormToolbarProps {
  title: string;
  onSave: (e?: React.FormEvent) => void;
  onCancel: () => void;
  saving?: boolean;
  isSaving?: boolean;
  onClose?: () => void;
}

export function FormToolbar({
  title,
  onSave,
  onCancel,
  saving = false,
  isSaving = false,
  onClose,
}: FormToolbarProps) {
  const finalSaving = saving || isSaving;
  const finalCancel = onCancel || onClose;

  // This bar's right-column grid card starts too close to this fixed chrome
  // for any top-right offset to clear both it and the toolbar at once (see
  // AppToaster.tsx) — tell the global toaster to switch to bottom-right,
  // where there's no fixed chrome to avoid, while this page is mounted.
  // Reset back to the list-page default on unmount.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("toast-config-change", { detail: FORM_TOOLBAR_CONFIG }));
    return () => {
      window.dispatchEvent(new CustomEvent("toast-config-change", { detail: LIST_PAGE_CONFIG }));
    };
  }, []);

  return (
    <>
      <div className="h-16 shrink-0" aria-hidden="true" />
      <div className="fixed top-16 left-0 right-0 lg:left-64 z-[100] h-16 bg-white border-b border-gray-200 shadow-sm flex justify-between items-center px-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-800 tracking-tight">{title}</h2>
        </div>

        <div className="flex items-center gap-3">
          {finalCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={finalCancel}
              disabled={finalSaving}
              leftIcon={<X size={16} />}
            >
              Cancel
            </Button>
          )}
          <Button
            type="button"
            variant="primary"
            onClick={onSave}
            isLoading={finalSaving}
            leftIcon={<Save size={16} />}
          >
            {finalSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </>
  );
}
