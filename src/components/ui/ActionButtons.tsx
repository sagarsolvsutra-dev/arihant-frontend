"use client";

import React from "react";
import { Edit, Trash2, BookOpen } from "lucide-react";

export interface EditButtonProps {
  onClick: () => void;
  title?: string;
  disabled?: boolean;
}

export const EditButton: React.FC<EditButtonProps> = ({
  onClick,
  title = "Edit",
  disabled = false,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className="inline-flex items-center justify-center rounded-md p-1 h-8 w-8 hover:bg-blue-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
  >
    <Edit size={16} className="text-blue-600" />
  </button>
);

export interface DeleteButtonProps {
  onClick: () => void;
  title?: string;
  disabled?: boolean;
}

export const DeleteButton: React.FC<DeleteButtonProps> = ({
  onClick,
  title = "Delete",
  disabled = false,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className="inline-flex items-center justify-center rounded-md p-1 h-8 w-8 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
  >
    <Trash2 size={16} className="text-red-600" />
  </button>
);

export interface LedgerButtonProps {
  onClick: () => void;
  title?: string;
  disabled?: boolean;
}

export const LedgerButton: React.FC<LedgerButtonProps> = ({
  onClick,
  title = "View Ledger",
  disabled = false,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className="inline-flex items-center justify-center rounded-md p-1 h-8 w-8 hover:bg-emerald-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
  >
    <BookOpen size={16} className="text-emerald-600" />
  </button>
);