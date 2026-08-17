"use client";

import React from "react";
import { AlertTriangle, HelpCircle } from "lucide-react";
import { Dialog } from "./Dialog";
import { Button } from "./Button";

export interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "primary";
  isLoading?: boolean;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "primary",
  isLoading = false,
}) => {
  const footer = (
    <>
      <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
        {cancelText}
      </Button>
      <Button
        variant={variant === "danger" ? "danger" : "primary"}
        size="sm"
        onClick={onConfirm}
        isLoading={isLoading}
      >
        {confirmText}
      </Button>
    </>
  );

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={title} footer={footer} size="sm">
      <div className="flex gap-3">
        <div className="shrink-0">
          {variant === "danger" ? (
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500">
              <AlertTriangle className="h-5 w-5" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
              <HelpCircle className="h-5 w-5" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-600 font-normal leading-relaxed">{message}</p>
        </div>
      </div>
    </Dialog>
  );
};
