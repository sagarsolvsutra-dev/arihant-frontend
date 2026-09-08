"use client";

import React, { useState } from "react";
import { MoreVertical, Image as ImageIcon, ChevronDown } from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  align?: "left" | "center" | "right";
  render?: (row: T, index: number) => React.ReactNode;
  // legacy alias used in some pages
  accessor?: ((row: T, index: number) => React.ReactNode) | keyof T;
  className?: string;
  primary?: boolean;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  skeletonRowsCount?: number;
  onRowClick?: (row: T) => void;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  emptyMessage?: string;
}

function getCellValue<T>(row: T, column: Column<T>, rowIndex: number): React.ReactNode {
  // 1. render function (preferred)
  if (typeof column.render === "function") {
    return column.render(row, rowIndex);
  }
  // 2. accessor as a function
  if (typeof column.accessor === "function") {
    return (column.accessor as (row: T, index: number) => React.ReactNode)(row, rowIndex);
  }
  // 3. accessor as a key (string)
  if (
    typeof column.accessor === "string" &&
    (row as any)[column.accessor] !== undefined
  ) {
    const v = (row as any)[column.accessor];
    return v === "" ? <span className="text-gray-400">NA</span> : v;
  }
  // 4. fallback: lookup by column.key
  const v = (row as any)[column.key];
  if (v === undefined || v === null || v === "") {
    return <span className="text-gray-400">NA</span>;
  }
  return v as React.ReactNode;
}

function getRowKey<T>(row: T, rowIndex: number): React.Key {
  // Transactional pages' own `Line` type carries a stable `.key` field precisely so
  // each grid row keeps its identity across inline-edits/removals — check it before
  // falling back to array index, which would otherwise silently defeat that.
  return (row as any).key ?? (row as any).id ?? (row as any)._id ?? `row-${rowIndex}`;
}

export function Table<T = any>({
  columns,
  data,
  isLoading = false,
  skeletonRowsCount = 5,
  onRowClick,
  pagination,
  emptyMessage = "No data available",
}: TableProps<T>) {
  return (
    <div className="w-full">
      {/* Desktop / tablet: standard table */}
      <div className="hidden md:block w-full overflow-x-auto rounded-lg border border-gray-200 shadow-sm bg-white">
        <table className="w-full border-collapse table-fixed">
          {/* Table Header */}
          <thead>
            <tr className="bg-black text-white text-xs font-semibold uppercase tracking-wider h-11 border-b border-gray-200">
              {columns.map((column, idx) => (
                <th
                  key={column.key || `col-${idx}-${column.header || ""}`}
                  className={`px-4 py-3 border-r border-gray-800 last:border-r-0 text-${column.align || "left"} font-medium text-white ${column.className || ""}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-gray-200 text-sm">
            {isLoading ? (
              // Skeleton Loader Rows
              Array.from({ length: skeletonRowsCount }).map((_, rowIndex) => (
                <tr key={`skeleton-${rowIndex}`} className="h-14 animate-pulse">
                  {columns.map((column, colIndex) => (
                    <td
                      key={`skeleton-cell-${colIndex}`}
                      className="px-4 py-3 border-r border-gray-200 last:border-r-0"
                    >
                      <div
                        className={`h-4 bg-gray-200 rounded-md w-3/4 mx-${
                          column.align === "center" ? "auto" : column.align === "right" ? "left" : "0"
                        }`}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length > 0 ? (
              data.map((row, rowIndex) => (
                <tr
                  key={getRowKey(row, rowIndex)}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`h-14 transition-colors hover:bg-gray-50/70 ${
                    onRowClick ? "cursor-pointer" : ""
                  }`}
                >
                  {columns.map((column, colIndex) => (
                    <td
                      key={`${String(getRowKey(row, rowIndex))}-${column.key || colIndex}`}
                      className={`px-4 py-3 border-r border-gray-200 last:border-r-0 text-${column.align || "left"} text-gray-800 ${
                        (column as any).className || ""
                      }`}
                    >
                      {getCellValue(row, column, rowIndex)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-400">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {pagination && pagination.totalPages > 1 && (
          <PaginationBar pagination={pagination} />
        )}
      </div>

      {/* Mobile: card list */}
      <div className="md:hidden flex flex-col gap-2.5">
        {isLoading ? (
          Array.from({ length: skeletonRowsCount }).map((_, i) => (
            <div
              key={`mskeleton-${i}`}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-3.5 animate-pulse flex items-center gap-3"
            >
              <div className="h-9 w-9 rounded-lg bg-gray-200 shrink-0" />
              <div className="h-4 bg-gray-200 rounded w-2/3" />
            </div>
          ))
        ) : data.length > 0 ? (
          <>
            {data.map((row, rowIndex) => (
              <MobileCard
                key={getRowKey(row, rowIndex)}
                row={row}
                rowIndex={rowIndex}
                columns={columns}
                onRowClick={onRowClick}
              />
            ))}
            {pagination && pagination.totalPages > 1 && (
              <MobilePaginationBar pagination={pagination} />
            )}
          </>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-8 text-center text-gray-400 text-sm">
            {emptyMessage}
          </div>
        )}
      </div>
    </div>
  );
}

function MobileCard<T>({
  row,
  rowIndex,
  columns,
  onRowClick,
}: {
  row: T;
  rowIndex: number;
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  // Word-bounded match — a bare substring test would also match e.g. a future
  // "Transaction No" header (which literally contains "action"), misclassifying it
  // as the actions slot and silently breaking that page's mobile card layout.
  const isActionsColumn = (col: Column<T>) => /(^|\s)actions?(\s|$)/i.test(col.header) || /ક્રિયા/.test(col.header) || col.key === "actions";
  const actionsColumn = columns.find(isActionsColumn);
  const actionsColIndex = columns.findIndex(isActionsColumn);
  
  const titleColIndex = columns.findIndex((c) => c.primary && !isActionsColumn(c));
  const primaryColIndex = titleColIndex !== -1 ? titleColIndex : columns.findIndex((c) => !isActionsColumn(c));
  
  const titleColumn = columns[primaryColIndex];
  const detailColumns = columns.filter((_, idx) => idx !== primaryColIndex && idx !== actionsColIndex);

  if (!titleColumn) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div
        className={`flex items-start justify-between gap-3 ${onRowClick ? "cursor-pointer" : ""}`}
        onClick={() => onRowClick && onRowClick(row)}
      >
        <div className="min-w-0 flex-1 text-sm font-semibold text-gray-900">
          {getCellValue(row, titleColumn, rowIndex)}
        </div>
        {actionsColumn && (
          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
            {getCellValue(row, actionsColumn, rowIndex)}
          </div>
        )}
      </div>

      {detailColumns.length > 0 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            className="mt-2.5 flex items-center gap-1 text-xs font-medium text-indigo-600"
          >
            વિગત (Details)
            <ChevronDown
              size={14}
              className={`transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </button>
          {expanded && (
            <div className="mt-2.5 space-y-1.5 border-t border-gray-100 pt-2.5">
              {detailColumns.map((col, i) => {
                const val = getCellValue(row, col, rowIndex);
                return (
                  <div
                    key={col.key || i}
                    className="flex items-start justify-between gap-3 text-xs"
                  >
                    <span className="text-gray-400 shrink-0">{col.header}</span>
                    <span className="text-gray-700 text-right">{val}</span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PaginationBar({
  pagination,
}: {
  pagination: { currentPage: number; totalPages: number; onPageChange: (page: number) => void };
}) {
  return (
    <div className="flex items-center justify-center p-4 border-t border-gray-200">
      <div className="flex items-center gap-1.5 text-sm font-medium">
        <button
          onClick={() => pagination.onPageChange(1)}
          disabled={pagination.currentPage === 1}
          className="px-3 py-1.5 border border-gray-200 rounded text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors"
        >
          &laquo; પ્રથમ (First)
        </button>
        <button
          onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
          disabled={pagination.currentPage === 1}
          className="px-3 py-1.5 border border-gray-200 rounded text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors"
        >
          &lsaquo; પાછળ (Back)
        </button>

        {(() => {
          const pages = [];
          const start = Math.max(1, pagination.currentPage - 2);
          const end = Math.min(pagination.totalPages, start + 4);

          if (start > 1) {
            pages.push(
              <button key={1} onClick={() => pagination.onPageChange(1)} className="px-3 py-1.5 border border-gray-200 rounded hover:bg-gray-50 text-gray-700">1</button>
            );
            if (start > 2) {
              pages.push(<span key="dots-1" className="px-2 text-gray-400">...</span>);
            }
          }

          for (let i = start; i <= end; i++) {
            pages.push(
              <button
                key={i}
                onClick={() => pagination.onPageChange(i)}
                className={`px-3 py-1.5 border rounded transition-colors ${i === pagination.currentPage ? "bg-black text-white border-black" : "border-gray-200 hover:bg-gray-50 text-gray-700"}`}
              >
                {i}
              </button>
            );
          }

          if (end < pagination.totalPages) {
            if (end < pagination.totalPages - 1) {
              pages.push(<span key="dots-2" className="px-2 text-gray-400">...</span>);
            }
            pages.push(
              <button key={pagination.totalPages} onClick={() => pagination.onPageChange(pagination.totalPages)} className="px-3 py-1.5 border border-gray-200 rounded hover:bg-gray-50 text-gray-700">{pagination.totalPages}</button>
            );
          }

          return pages;
        })()}

        <button
          onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
          disabled={pagination.currentPage === pagination.totalPages}
          className="px-3 py-1.5 border border-gray-200 rounded text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors"
        >
          આગળ (Next) &rsaquo;
        </button>
        <button
          onClick={() => pagination.onPageChange(pagination.totalPages)}
          disabled={pagination.currentPage === pagination.totalPages}
          className="px-3 py-1.5 border border-gray-200 rounded text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors"
        >
          છેલ્લું (Last) &raquo;
        </button>
      </div>
    </div>
  );
}

// Compact Prev / Page X of Y / Next bar, sized for narrow mobile screens.
function MobilePaginationBar({
  pagination,
}: {
  pagination: { currentPage: number; totalPages: number; onPageChange: (page: number) => void };
}) {
  return (
    <div className="flex flex-col gap-3 bg-transparent py-2">
      <div className="flex items-center justify-between gap-1.5">
        <button
          onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
          disabled={pagination.currentPage === 1}
          className="px-3 py-1.5 border border-gray-200 rounded-lg bg-white text-gray-600 disabled:opacity-40 text-xs font-medium hover:bg-gray-50 transition-colors"
        >
          &lsaquo; પાછળ
        </button>
        
        <div className="flex items-center gap-1 overflow-x-auto">
          {(() => {
            const pages = [];
            const start = Math.max(1, pagination.currentPage - 1);
            const end = Math.min(pagination.totalPages, start + 2);
            for (let i = start; i <= end; i++) {
              pages.push(
                <button
                  key={i}
                  onClick={() => pagination.onPageChange(i)}
                  className={`min-w-8 h-8 rounded transition-colors text-xs font-medium ${i === pagination.currentPage ? "bg-black text-white" : "bg-white border border-gray-200 text-gray-700"}`}
                >
                  {i}
                </button>
              );
            }
            return pages;
          })()}
        </div>

        <button
          onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
          disabled={pagination.currentPage === pagination.totalPages}
          className="px-3 py-1.5 border border-gray-200 rounded-lg bg-white text-gray-600 disabled:opacity-40 text-xs font-medium hover:bg-gray-50 transition-colors"
        >
          આગળ &rsaquo;
        </button>
      </div>
      <div className="flex items-center justify-end gap-2 text-xs text-gray-500 font-medium mt-1">
        પાનું (Page)
        <input
          // Remounts the input whenever the actual current page changes (via Prev/
          // Next/a numbered button), so its uncontrolled `defaultValue` re-applies —
          // without this it only ever reflected whatever page was current when this
          // component instance first mounted.
          key={pagination.currentPage}
          type="number"
          min={1}
          max={pagination.totalPages}
          defaultValue={pagination.currentPage}
          className="w-12 h-7 px-1.5 text-center border border-gray-200 rounded bg-white text-gray-800"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const val = parseInt((e.target as HTMLInputElement).value);
              if (val >= 1 && val <= pagination.totalPages) {
                pagination.onPageChange(val);
              }
            }
          }}
        />
        જાઓ (Go)
      </div>
    </div>
  );
}

// Helper badge component for Table status
export const StatusBadge: React.FC<{ status: "Active" | "Inactive" | string }> = ({ status }) => {
  const isActive = status?.toLowerCase() === "active";
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200
        ${
          isActive
            ? "bg-green-50 text-green-600 border border-green-200/50"
            : "bg-red-50 text-red-600 border border-red-200/50"
        }`}
    >
      {status}
    </span>
  );
};

// Helper badge component for low stock quantity
export const QtyBadge: React.FC<{ qty: number; alertQty: number }> = ({ qty, alertQty }) => {
  const isLow = qty <= alertQty;
  return isLow ? (
    <span className="inline-flex items-center justify-center min-w-[28px] h-[28px] px-2 rounded-full text-xs font-semibold bg-red-50 text-red-500 border border-red-100">
      {qty}
    </span>
  ) : (
    <span className="text-gray-800 font-medium">{qty}</span>
  );
};

// Helper component for Product Name HSN details
export const ProductNameCell: React.FC<{ name: string; hsn?: string }> = ({ name, hsn }) => {
  return (
    <div className="flex flex-col py-1">
      <span className="font-semibold text-gray-800 text-sm leading-snug">{name}</span>
      {hsn && <span className="text-[10px] font-medium text-gray-400 tracking-wider">HSN: {hsn}</span>}
    </div>
  );
};

// Helper component for Product Image placeholder
export const ProductImageCell: React.FC<{ src?: string }> = ({ src }) => {
  return (
    <div className="flex items-center justify-center">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt="product"
          className="w-10 h-10 object-cover rounded-lg border border-gray-100 shadow-sm"
        />
      ) : (
        <div className="w-10 h-10 flex items-center justify-center bg-gray-50 border border-gray-100 rounded-lg text-gray-300">
          <ImageIcon className="h-5 w-5" />
        </div>
      )}
    </div>
  );
};

// Helper component for Actions Column
export const ActionsCell: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-800 transition-colors duration-200"
    >
      <MoreVertical className="h-4.5 w-4.5" />
    </button>
  );
};
