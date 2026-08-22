"use client";

import React from "react";
import { MoreVertical, Image as ImageIcon } from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  align?: "left" | "center" | "right";
  render?: (row: T, index: number) => React.ReactNode;
  // legacy alias used in some pages
  accessor?: ((row: T, index: number) => React.ReactNode) | keyof T;
  className?: string;
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
    <div className="w-full overflow-x-auto rounded-lg border border-gray-200 shadow-sm bg-white">
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
                key={
                  (row as any).id ??
                  (row as any)._id ??
                  `row-${rowIndex}`
                }
                onClick={() => onRowClick && onRowClick(row)}
                className={`h-14 transition-colors hover:bg-gray-50/70 ${
                  onRowClick ? "cursor-pointer" : ""
                }`}
              >
                {columns.map((column, colIndex) => {
                  const cell = (() => {
                    // 1. render function (preferred)
                    if (typeof column.render === "function") {
                      return column.render(row, rowIndex);
                    }
                    // 2. accessor as a function
                    if (typeof column.accessor === "function") {
                      return column.accessor(row, rowIndex);
                    }
                    // 3. accessor as a key (string)
                    if (
                      typeof column.accessor === "string" &&
                      (row as any)[column.accessor] !== undefined
                    ) {
                      const v = (row as any)[column.accessor];
                      return v === "" ? (
                        <span className="text-gray-400">NA</span>
                      ) : (
                        v
                      );
                    }
                    // 4. fallback: lookup by column.key
                    const v = (row as any)[column.key];
                    if (v === undefined || v === null || v === "") {
                      return <span className="text-gray-400">NA</span>;
                    }
                    return v as React.ReactNode;
                  })();
                  return (
                    <td
                      key={`${
                        (row as any).id ?? (row as any)._id ?? rowIndex
                      }-${column.key || colIndex}`}
                      className={`px-4 py-3 border-r border-gray-200 last:border-r-0 text-${column.align || "left"} text-gray-800 ${
                        (column as any).className || ""
                      }`}
                    >
                      {cell}
                    </td>
                  );
                })}
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
        <div className="flex items-center justify-center p-4 border-t border-gray-200">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <button
              onClick={() => pagination.onPageChange(1)}
              disabled={pagination.currentPage === 1}
              className="px-3 py-1.5 border border-gray-200 rounded text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              &laquo; First
            </button>
            <button
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
              className="px-3 py-1.5 border border-gray-200 rounded text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              &lsaquo; Back
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
              Next &rsaquo;
            </button>
            <button
              onClick={() => pagination.onPageChange(pagination.totalPages)}
              disabled={pagination.currentPage === pagination.totalPages}
              className="px-3 py-1.5 border border-gray-200 rounded text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Last &raquo;
            </button>
          </div>
        </div>
      )}
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
