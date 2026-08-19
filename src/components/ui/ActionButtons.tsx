"use client";

import React from "react";
import { Edit2, Trash2 } from "lucide-react";

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
    className="icon-btn cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
  >
    <Edit2 size={15} />
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
    className="icon-btn icon-btn-danger cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
  >
    <Trash2 size={15} />
  </button>
);