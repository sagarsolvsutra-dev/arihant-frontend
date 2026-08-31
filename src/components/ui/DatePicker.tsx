"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

export interface DatePickerProps {
  label?: string;
  placeholder?: string;
  value?: string; // "YYYY-MM-DD"
  onChange: (value: string) => void;
  isRequired?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
  disabled?: boolean;
  // "YYYY-MM-DD" — dates before this are greyed out and unclickable in the calendar.
  minDate?: string;
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function parseValue(value?: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatDisplay(value?: string): string {
  const d = parseValue(value);
  if (!d) return "";
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
}

function toValue(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export const DatePicker: React.FC<DatePickerProps> = ({
  label,
  placeholder = "Select date",
  value,
  onChange,
  isRequired = false,
  error,
  helperText,
  className = "",
  disabled = false,
  minDate,
}) => {
  const selectedDate = parseValue(value);
  const minDateValue = parseValue(minDate);
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(selectedDate || new Date());
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) setViewDate(selectedDate || minDateValue || new Date());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownHeight = 340;
      const isUp = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

      setDropdownStyle({
        position: "fixed",
        top: isUp ? "auto" : `${rect.bottom + 4}px`,
        bottom: isUp ? `${window.innerHeight - rect.top + 4}px` : "auto",
        left: `${rect.left}px`,
        minWidth: `${Math.max(rect.width, 260)}px`,
        zIndex: 99999,
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
      return () => {
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const isInsideContainer = containerRef.current?.contains(event.target as Node);
      const isInsideDropdown = dropdownRef.current?.contains(event.target as Node);
      if (!isInsideContainer && !isInsideDropdown) setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const hasError = !!error;

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = startOffset - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, daysInPrevMonth - i), inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), inMonth: true });
  }
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  for (let d = 1; d <= totalCells - cells.length; d++) {
    cells.push({ date: new Date(year, month + 1, d), inMonth: false });
  }

  const today = new Date();

  const handlePick = (d: Date) => {
    onChange(toValue(d));
    setIsOpen(false);
  };

  const dropdownMenu = (
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      className="bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden animate-fadeIn p-3"
    >
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className="p-1 rounded hover:bg-gray-100 text-gray-500"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold text-gray-900">
          {MONTHS[month]} {year}
        </span>
        <button
          type="button"
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          className="p-1 rounded hover:bg-gray-100 text-gray-500"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-gray-400 mb-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map(({ date, inMonth }, i) => {
          const isSelected = !!selectedDate && isSameDay(date, selectedDate);
          const isToday = isSameDay(date, today);
          const isDisabled = !!minDateValue && date < minDateValue && !isSameDay(date, minDateValue);
          return (
            <button
              key={i}
              type="button"
              onClick={() => !isDisabled && handlePick(date)}
              disabled={isDisabled}
              title={isDisabled ? `Cannot select a date before ${formatDisplay(minDate)}` : undefined}
              className={`h-8 w-8 text-xs rounded-md flex items-center justify-center transition-colors
                ${isDisabled ? "text-gray-200 cursor-not-allowed hover:bg-transparent" : !inMonth ? "text-gray-300 hover:bg-gray-50" : "text-gray-700 hover:bg-gray-100"}
                ${isSelected ? "!bg-gray-900 !text-white font-semibold" : ""}
                ${isToday && !isSelected && !isDisabled ? "border border-gray-900 font-semibold" : ""}
              `}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={() => { onChange(""); setIsOpen(false); }}
          className="text-xs font-medium text-gray-500 hover:text-gray-800"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => {
            const now = new Date();
            if (minDateValue && now < minDateValue && !isSameDay(now, minDateValue)) return;
            onChange(toValue(now));
            setIsOpen(false);
          }}
          disabled={!!minDateValue && today < minDateValue && !isSameDay(today, minDateValue)}
          className="text-xs font-medium text-gray-900 hover:underline disabled:text-gray-300 disabled:cursor-not-allowed disabled:no-underline"
        >
          Today
        </button>
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className="w-full flex flex-col gap-1.5 relative">
      {label && (
        <label className="text-xs font-semibold text-gray-700 flex items-center gap-0.5">
          {label}
          {isRequired && <span className="text-red-500 font-bold">*</span>}
        </label>
      )}

      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          if (!disabled) {
            if (!isOpen) updatePosition();
            setIsOpen(!isOpen);
          }
        }}
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
        <span className={`truncate ${selectedDate ? "text-gray-900 font-medium" : "text-gray-400"}`}>
          {selectedDate ? formatDisplay(value) : placeholder}
        </span>
        <CalendarIcon className="h-4 w-4 text-gray-400 shrink-0" />
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

export default DatePicker;
