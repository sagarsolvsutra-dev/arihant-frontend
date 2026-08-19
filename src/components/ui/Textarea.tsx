"use client";

import React, { TextareaHTMLAttributes, forwardRef } from "react";

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  isRequired?: boolean;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    { className = "", label, error, isRequired, helperText, id, ...props },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold text-gray-700 flex items-center gap-0.5"
          >
            {label}
            {isRequired && <span className="text-red-500 font-bold">*</span>}
          </label>
        )}

        <textarea
          ref={ref}
          id={inputId}
          className={`w-full px-3 py-2 text-sm border rounded-lg bg-white transition-all duration-200 placeholder-gray-400 focus:outline-none focus:ring-2 resize-none
            ${
              error
                ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                : "border-gray-300 focus:border-blue-500 focus:ring-blue-100 hover:border-gray-400"
            }
            ${className}`}
          {...props}
        />

        {error ? (
          <span className="text-xs font-medium text-red-500 animate-fadeIn">
            {error}
          </span>
        ) : helperText ? (
          <span className="text-xs text-gray-500">{helperText}</span>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";