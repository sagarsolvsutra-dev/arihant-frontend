import React from "react";
import { Skeleton } from "./Skeleton";

export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6 py-6 px-4 max-w-7xl mx-auto w-full">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Filters/Search Skeleton */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      {/* Table Skeleton Container */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
        {/* Table Header */}
        <div className="bg-gray-900 h-11 w-full border-b border-gray-200 px-4 py-3 flex gap-4">
          <Skeleton className="h-4 flex-1 bg-gray-700/50" />
          <Skeleton className="h-4 flex-1 bg-gray-700/50" />
          <Skeleton className="h-4 flex-1 bg-gray-700/50" />
          <Skeleton className="h-4 flex-1 bg-gray-700/50" />
          <Skeleton className="h-4 w-16 bg-gray-700/50" />
        </div>
        
        {/* Table Rows */}
        <div className="divide-y divide-gray-200">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-4 py-4 flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
