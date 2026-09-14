"use client";

import React from "react";
import { Check } from "lucide-react";
import {
  PERMISSION_MODULES,
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  MODULE_ACTIONS,
  ACTION_LABELS,
  PermissionModule,
  PermissionAction,
  PermissionsMap,
  toggleActionInPermissions,
  isModuleFullyGranted,
  toggleModuleRowInPermissions,
  isColumnFullyGranted,
  toggleColumnInPermissions,
  isAllFullyGranted,
  toggleAllModulesInPermissions,
} from "@/lib/permissions";

const ALL_ACTIONS: PermissionAction[] = ["view", "create", "edit", "delete"];

interface PermissionMatrixProps {
  permissions: PermissionsMap;
  onChange: (next: PermissionsMap) => void;
}

// Shared by company_admin's staff/page.tsx and super_admin's
// super-admin/users/page.tsx "Add User" dialog (both edit a staff member's
// PermissionsMap) — grouped TRANSACTIONS/MASTERS/REPORTS rows with a
// row-select-all checkbox per module and a column-select-all checkbox per
// action, modeled on a reference permissions-UI screenshot the user shared.
// Bounded, independently-scrolling with a sticky header so the column
// checkboxes stay visible while scrolling through all 19 module rows — see
// CLAUDE.md's Staff & Permissions Module section for the scroll-bug history
// this was built to avoid repeating.
export function PermissionMatrix({ permissions, onChange }: PermissionMatrixProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-xs font-semibold text-gray-700">
          Permissions — exactly what this staff member can View, Create, Edit, and Delete in each module
        </label>
        <span className="text-[11px] text-gray-400">
          Tick a row for full access to a module, or a column header for one action everywhere
        </span>
      </div>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="max-h-[360px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-900 text-white">
                <th className="text-left px-3 py-2 font-semibold">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isAllFullyGranted(permissions, PERMISSION_MODULES)}
                      onChange={() => onChange(toggleAllModulesInPermissions(permissions, PERMISSION_MODULES))}
                      className="h-3.5 w-3.5 rounded border-gray-400 accent-white cursor-pointer"
                      title="Grant/revoke everything"
                    />
                    Module
                  </label>
                </th>
                {ALL_ACTIONS.map((a) => (
                  <th key={a} className="text-center px-2 py-2 font-semibold w-16">
                    <label className="flex flex-col items-center gap-1 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isColumnFullyGranted(permissions, a, PERMISSION_MODULES)}
                        onChange={() => onChange(toggleColumnInPermissions(permissions, a, PERMISSION_MODULES))}
                        className="h-3.5 w-3.5 rounded border-gray-400 accent-white cursor-pointer"
                        title={`Grant/revoke "${ACTION_LABELS[a]}" for every module`}
                      />
                      {ACTION_LABELS[a]}
                    </label>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_GROUPS.map((group) => (
                <React.Fragment key={group.label}>
                  <tr className="bg-gray-50">
                    <td
                      colSpan={ALL_ACTIONS.length + 1}
                      className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 border-t border-gray-100"
                    >
                      {group.label}
                    </td>
                  </tr>
                  {group.modules.map((moduleKey: PermissionModule) => {
                    const grant = permissions[moduleKey] || {};
                    const supported = MODULE_ACTIONS[moduleKey];
                    return (
                      <tr key={moduleKey} className="border-t border-gray-100">
                        <td className="px-3 py-2 font-medium text-gray-800">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isModuleFullyGranted(permissions, moduleKey)}
                              onChange={() => onChange(toggleModuleRowInPermissions(permissions, moduleKey))}
                              className="h-3.5 w-3.5 rounded border-gray-300 cursor-pointer"
                              title={`Grant/revoke full access to ${PERMISSION_LABELS[moduleKey]}`}
                            />
                            {PERMISSION_LABELS[moduleKey]}
                          </label>
                        </td>
                        {ALL_ACTIONS.map((action) => {
                          if (!supported.includes(action)) {
                            return (
                              <td key={action} className="text-center px-2 py-2 text-gray-300">
                                —
                              </td>
                            );
                          }
                          const checked = !!grant[action];
                          return (
                            <td key={action} className="text-center px-2 py-2">
                              <button
                                type="button"
                                onClick={() => onChange(toggleActionInPermissions(permissions, moduleKey, action))}
                                className={`inline-flex items-center justify-center w-6 h-6 rounded border transition-colors ${
                                  checked
                                    ? "bg-gray-900 border-gray-900 text-white"
                                    : "bg-white border-gray-300 hover:border-gray-500"
                                }`}
                                title={`${ACTION_LABELS[action]} — ${PERMISSION_LABELS[moduleKey]}`}
                              >
                                {checked && <Check size={13} />}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {Object.keys(permissions).length === 0 && (
        <p className="text-xs text-amber-600 mt-2">
          No permissions granted — this staff member will only see the Dashboard after logging in.
        </p>
      )}
      <p className="text-xs text-gray-400 mt-2">
        Checking Create, Edit, or Delete automatically checks View too — a module can't be edited without also being open-able.
      </p>
    </div>
  );
}
