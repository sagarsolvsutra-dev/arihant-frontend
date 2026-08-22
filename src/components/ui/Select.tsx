"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
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
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = () => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      // Calculate position. We use fixed positioning so it moves correctly if parent scrolls (if scroll listener updates it).
      
      // Check if there is enough space below, otherwise show above
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownHeight = 250; // estimated max height
      
      let topPosition = rect.bottom + 4;
      let isUp = false;
      
      if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
        // Show above
        isUp = true;
      }
      
      setDropdownStyle({
        position: "fixed",
        top: isUp ? "auto" : `${topPosition}px`,
        bottom: isUp ? `${window.innerHeight - rect.top + 4}px` : "auto",
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        zIndex: 99999,
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      // Listen to scroll events on any scrollable parent to update position
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
      return () => {
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [isOpen]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if click is inside the container (button) or the dropdown portal
      const isInsideContainer = containerRef.current?.contains(event.target as Node);
      const isInsideDropdown = dropdownRef.current?.contains(event.target as Node);
      
      if (!isInsideContainer && !isInsideDropdown) {
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

  const dropdownMenu = (
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      className="bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden animate-fadeIn"
    >
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
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
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
  );

  return (
    <div ref={containerRef} className="w-full flex flex-col gap-1.5 relative">
      {label && (
        <label className="text-xs font-semibold text-gray-700 flex items-center gap-0.5">
          {label}
          {finalRequired && <span className="text-red-500 font-bold">*</span>}
        </label>
      )}

      <button
        ref={buttonRef}
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
          ${className}
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

      {isOpen && !disabled && mounted && createPortal(dropdownMenu, document.body)}

      {error ? (
        <span className="text-xs font-medium text-red-500">{error}</span>
      ) : helperText ? (
        <span className="text-xs text-gray-500">{helperText}</span>
      ) : null}
    </div>
  );
};

export default Select;
