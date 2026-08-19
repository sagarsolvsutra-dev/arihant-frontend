"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, Check } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  selectedValue?: string;
  value?: string;
  onChange: (value: string) => void;
  isRequired?: boolean;
  required?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
  disabled?: boolean;
  searchable?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  label,
  placeholder = "Select option",
  options,
  selectedValue,
  value,
  onChange,
  isRequired = false,
  required = false,
  error,
  helperText,
  className = "",
  disabled = false,
  searchable = true,
}) => {
  const finalValue = value !== undefined ? value : selectedValue;
  const finalRequired = isRequired || required;

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearch("");
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current && searchable) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, searchable]);

  // Reset search when dropdown closes
  useEffect(() => {
    if (!isOpen) setSearch("");
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === finalValue);

  const filteredOptions = searchable
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(search.toLowerCase())
      )
    : options;

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearch("");
  };

  const hasError = !!error;

  return (
    <div ref={containerRef} className={`w-full flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-xs font-semibold text-gray-700 flex items-center gap-0.5">
          {label}
          {finalRequired && <span className="text-red-500 font-bold">*</span>}
        </label>
      )}

      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-lg bg-white transition-all
          ${
            hasError
              ? "border border-red-500 focus:ring-2 focus:ring-red-200"
              : isOpen
              ? "border border-gray-900 ring-2 ring-gray-900/10"
              : "border border-gray-300 hover:border-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
          }
          ${disabled ? "opacity-50 cursor-not-allowed bg-gray-50" : "cursor-pointer"}
        `}
      >
        <span
          className={`truncate ${
            selectedOption ? "text-gray-900 font-medium" : "text-gray-400"
          }`}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform shrink-0 ${
            isOpen ? "transform rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && !disabled && (
        <div
          className="relative"
          style={{ zIndex: 50 }}
        >
          <div className="absolute top-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden animate-fadeIn">
            {searchable && (
              <div className="p-2 border-b border-gray-100 bg-gray-50/50">
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                  <input
                    ref={inputRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search..."
                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                  />
                </div>
              </div>
            )}

            <div className="max-h-60 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-3 text-xs text-gray-400 text-center">
                  No matching options
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between transition-colors
                      ${
                        option.value === finalValue
                          ? "bg-gray-900 text-white font-medium"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                  >
                    <span className="truncate">{option.label}</span>
                    {option.value === finalValue && (
                      <Check size={14} className="shrink-0 ml-2" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {error ? (
        <span className="text-xs font-medium text-red-500">{error}</span>
      ) : helperText ? (
        <span className="text-xs text-gray-500">{helperText}</span>
      ) : null}
    </div>
  );
};

export default Select;
