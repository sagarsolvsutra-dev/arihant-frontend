"use client";

import React, { useState } from "react";

export interface TabDef {
  key: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: TabDef[];
  defaultKey?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, defaultKey }) => {
  const [active, setActive] = useState(defaultKey || tabs[0]?.key);
  const activeTab = tabs.find((t) => t.key === active) || tabs[0];

  return (
    <div>
      <div className="flex flex-wrap gap-2 bg-gray-50 border-b border-gray-200 p-3 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActive(tab.key)}
              className={`flex items-center gap-2 pl-3 pr-2.5 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-gray-900 text-white shadow-sm"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.badge && (
                <span
                  className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${
                    isActive ? "bg-white/15 text-white" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div>{activeTab?.content}</div>
    </div>
  );
};

export default Tabs;
