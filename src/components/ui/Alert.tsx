"use client";

import React from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

export interface AlertProps {
  variant?: "error" | "success" | "info";
  title?: string;
  message?: string;
  onClose?: () => void;
  className?: string;
}

const variantConfig = {
  error: {
    className: "alert-error",
    Icon: AlertCircle,
    iconColor: "text-red-500",
  },
  success: {
    className: "alert-success",
    Icon: CheckCircle2,
    iconColor: "text-green-500",
  },
  info: {
    className: "alert-info",
    Icon: Info,
    iconColor: "text-blue-500",
  },
};

export const Alert: React.FC<AlertProps> = ({
  variant = "info",
  title,
  message,
  onClose,
  className = "",
}) => {
  const { className: variantClass, Icon, iconColor } = variantConfig[variant];

  return (
    <div className={`alert ${variantClass} ${className}`}>
      <Icon size={18} className={`shrink-0 mt-0.5 ${iconColor}`} />
      <div className="flex-1 min-w-0">
        {title && <div className="font-semibold">{title}</div>}
        {message && (
          <div className={title ? "text-xs mt-0.5 opacity-90" : ""}>
            {message}
          </div>
        )}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="p-0.5 hover:bg-black/5 rounded transition-colors"
          aria-label="Close"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};