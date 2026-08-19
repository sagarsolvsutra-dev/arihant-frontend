"use client";

import React from "react";
import { AlertTriangle, LogOut, Info, X } from "lucide-react";
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
  variant?: "danger" | "primary" | "warning";
  isLoading?: boolean;
  // Optional details to show user info
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
}

const variantConfig = {
  danger: {
    iconBg: "bg-red-50",
    iconColor: "text-red-600",
    confirmVariant: "danger" as const,
    Icon: AlertTriangle,
    confirmClass: "bg-red-600 hover:bg-red-700 text-white",
  },
  warning: {
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    confirmVariant: "primary" as const,
    Icon: AlertTriangle,
    confirmClass: "bg-amber-600 hover:bg-amber-700 text-white",
  },
  primary: {
    iconBg: "bg-gray-100",
    iconColor: "text-gray-700",
    confirmVariant: "primary" as const,
    Icon: Info,
    confirmClass: "bg-gray-900 hover:bg-black text-white",
  },
};

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
  userName,
  userEmail,
}) => {
  const { iconBg, iconColor, confirmClass, Icon } = variantConfig[variant];

  const footer = (
    <div className="flex items-center justify-end gap-3 w-full">
      <Button variant="outline" onClick={onClose} disabled={isLoading}>
        {cancelText}
      </Button>
      <Button
        variant={variant === "danger" ? "danger" : "primary"}
        onClick={onConfirm}
        isLoading={isLoading}
        leftIcon={variant === "danger" ? <LogOut size={14} /> : undefined}
      >
        {confirmText}
      </Button>
    </div>
  );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={footer}
      size="sm"
    >
      <div className="flex gap-4">
        {/* Icon */}
        <div className="shrink-0">
          <div
            className={`w-12 h-12 rounded-full ${iconBg} flex items-center justify-center`}
          >
            <Icon size={22} className={iconColor} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pt-1">
          <p className="text-sm text-gray-700 leading-relaxed font-normal">
            {message}
          </p>

          {/* User info card */}
          {(userName || userEmail) && (
            <div className="mt-3 flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
              <div className="w-9 h-9 rounded-full bg-gray-900 text-white font-semibold text-sm flex items-center justify-center shrink-0">
                {userName ? userName.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="min-w-0 flex-1">
                {userName && (
                  <div className="text-sm font-semibold text-gray-900 truncate">
                    {userName}
                  </div>
                )}
                {userEmail && (
                  <div className="text-xs text-gray-500 truncate">
                    {userEmail}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Reassurance note */}
          {/* {variant === "danger" && (
            <p className="mt-3 text-xs text-gray-500 italic">
              You can always log back in with your credentials.
            </p>
          )} */}
        </div>
      </div>
    </Dialog>
  );
};