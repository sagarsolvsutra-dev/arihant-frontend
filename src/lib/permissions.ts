// Mirrors arihant-backend/src/utils/permissions.js — keep these two files in
// sync by hand if a module/action is ever added or removed (no shared
// package between the two halves of the app enforces this automatically).
//
// Real per-module CRUD (Create/View/Edit/Delete), not just a flat "can open
// this at all" list.
//
// ⚠️ HISTORY: master data used to be ONE combined "masters" module — that
// was superseded by a direct follow-up request to split every master-data
// resource into its own separately-grantable module (matching a reference
// permissions-UI screenshot the user shared, which also drove the
// PERMISSION_GROUPS/row-select-all/column-select-all UI below). The flat
// "masters" key no longer exists anywhere in the code. "reports" only ever
// has "view" — there's nothing to create/edit/delete in a report.
export const PERMISSION_MODULES = [
  "purchase",
  "sale",
  "purchaseReturn",
  "saleReturn",
  "stockTransfer",
  "reports",
  "items",
  "customers",
  "suppliers",
  "godowns",
  "hsn",
  "itemNames",
  "itemSubGroups",
  "customerGroups",
  "supplierGroups",
  "godownGroups",
  "salesmen",
  "schemes",
  "openingBills",
] as const;

export type PermissionModule = (typeof PERMISSION_MODULES)[number];
export type PermissionAction = "view" | "create" | "edit" | "delete";

export const MODULE_ACTIONS: Record<PermissionModule, PermissionAction[]> = {
  purchase: ["view", "create", "edit", "delete"],
  sale: ["view", "create", "edit", "delete"],
  purchaseReturn: ["view", "create", "edit", "delete"],
  saleReturn: ["view", "create", "edit", "delete"],
  stockTransfer: ["view", "create", "edit", "delete"],
  reports: ["view"],
  items: ["view", "create", "edit", "delete"],
  customers: ["view", "create", "edit", "delete"],
  suppliers: ["view", "create", "edit", "delete"],
  godowns: ["view", "create", "edit", "delete"],
  hsn: ["view", "create", "edit", "delete"],
  itemNames: ["view", "create", "edit", "delete"],
  itemSubGroups: ["view", "create", "edit", "delete"],
  customerGroups: ["view", "create", "edit", "delete"],
  supplierGroups: ["view", "create", "edit", "delete"],
  godownGroups: ["view", "create", "edit", "delete"],
  salesmen: ["view", "create", "edit", "delete"],
  schemes: ["view", "create", "edit", "delete"],
  openingBills: ["view", "create", "edit", "delete"],
};

export const PERMISSION_LABELS: Record<PermissionModule, string> = {
  purchase: "Purchase",
  sale: "Sale",
  purchaseReturn: "Purchase Return",
  saleReturn: "Sale Return",
  stockTransfer: "Stock Transfer",
  reports: "Reports",
  items: "Items / M.R.Ps.",
  customers: "Customers",
  suppliers: "Suppliers",
  godowns: "Godowns",
  hsn: "HSN Codes",
  itemNames: "Item Names",
  itemSubGroups: "Item Sub Groups",
  customerGroups: "Customer Groups",
  supplierGroups: "Supplier Groups",
  godownGroups: "Godown Groups",
  salesmen: "Salesmen",
  schemes: "Schemes",
  openingBills: "Opening Bills",
};

// UI-only grouping (the backend has no notion of this — it just checks a
// flat module key) — drives the section-header rows in the Staff permission
// matrix, mirroring the grouped-by-category reference screenshot the user
// shared (their example grouped rows under headers like "INVENTORY").
export const PERMISSION_GROUPS: { label: string; modules: PermissionModule[] }[] = [
  { label: "Transactions", modules: ["purchase", "sale", "purchaseReturn", "saleReturn", "stockTransfer"] },
  {
    label: "Masters",
    modules: [
      "items",
      "customers",
      "suppliers",
      "godowns",
      "hsn",
      "itemNames",
      "itemSubGroups",
      "customerGroups",
      "supplierGroups",
      "godownGroups",
      "salesmen",
      "schemes",
      "openingBills",
    ],
  },
  { label: "Reports", modules: ["reports"] },
];

export const ACTION_LABELS: Record<PermissionAction, string> = {
  view: "View",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
};

export type PermissionGrant = Partial<Record<PermissionAction, boolean>>;
export type PermissionsMap = Partial<Record<PermissionModule, PermissionGrant>>;

// A staff member's own `can(...)` check — company_admin/super_admin should
// always pass `true` for isCompanyAdmin (or otherwise bypass this entirely,
// see AdminLayout.tsx/hasAction usages) rather than being routed through
// this function, which only makes sense for a real permissions map.
export function can(permissions: PermissionsMap | undefined, moduleKey: PermissionModule, action: PermissionAction): boolean {
  return !!permissions?.[moduleKey]?.[action];
}

export function getCurrentUser(): any {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// One-liner for a page's own button-visibility logic (e.g. hide "Add
// Purchase" unless canAction("purchase", "create") is true, hide a row's
// Edit icon unless canAction("purchase", "edit"), etc.) — company_admin and
// super_admin always return true; a staff member is checked against their
// own granted permissions. The backend enforces the real boundary on every
// gated route regardless of what this returns (see CLAUDE.md's Staff &
// Permissions section) — this is a UX layer on top of that, not a
// substitute for it.
export function canAction(moduleKey: PermissionModule, action: PermissionAction): boolean {
  const user = getCurrentUser();
  if (!user) return false;
  if (user.role === "super_admin" || user.role === "company_admin") return true;
  return can(user.permissions as PermissionsMap, moduleKey, action);
}

// Pure permission-map transforms shared by every UI that edits a
// PermissionsMap (currently company_admin's staff/page.tsx and super_admin's
// super-admin/users/page.tsx "Add User" dialog — see components/ui/
// PermissionMatrix.tsx, which both pages render). Kept here rather than
// duplicated per-page since they're plain data transforms with no React
// dependency — "view" is the baseline a module can't lose while keeping
// other actions (turning it off clears the whole module's grant; turning
// on any other action implicitly turns "view" on too).

export function toggleActionInPermissions(
  perms: PermissionsMap,
  moduleKey: PermissionModule,
  action: PermissionAction
): PermissionsMap {
  const current = perms[moduleKey] || {};
  const nextValue = !current[action];
  if (action === "view" && !nextValue) {
    const { [moduleKey]: _drop, ...rest } = perms;
    return rest;
  }
  const nextGrant: PermissionGrant = { ...current, [action]: nextValue };
  if (action !== "view" && nextValue) nextGrant.view = true;
  return { ...perms, [moduleKey]: nextGrant };
}

export function isModuleFullyGranted(perms: PermissionsMap, moduleKey: PermissionModule): boolean {
  return MODULE_ACTIONS[moduleKey].every((a) => !!perms[moduleKey]?.[a]);
}

export function toggleModuleRowInPermissions(perms: PermissionsMap, moduleKey: PermissionModule): PermissionsMap {
  if (isModuleFullyGranted(perms, moduleKey)) {
    const { [moduleKey]: _drop, ...rest } = perms;
    return rest;
  }
  const grant: PermissionGrant = {};
  MODULE_ACTIONS[moduleKey].forEach((a) => {
    grant[a] = true;
  });
  return { ...perms, [moduleKey]: grant };
}

export function isColumnFullyGranted(
  perms: PermissionsMap,
  action: PermissionAction,
  modules: readonly PermissionModule[]
): boolean {
  const applicable = modules.filter((m) => MODULE_ACTIONS[m].includes(action));
  return applicable.length > 0 && applicable.every((m) => !!perms[m]?.[action]);
}

export function toggleColumnInPermissions(
  perms: PermissionsMap,
  action: PermissionAction,
  modules: readonly PermissionModule[]
): PermissionsMap {
  const applicable = modules.filter((m) => MODULE_ACTIONS[m].includes(action));
  const fullyGranted = isColumnFullyGranted(perms, action, modules);
  const next: PermissionsMap = { ...perms };
  applicable.forEach((m) => {
    const current = next[m] || {};
    if (fullyGranted) {
      if (action === "view") {
        delete next[m];
      } else {
        const { [action]: _drop, ...rest } = current;
        if (Object.keys(rest).length) next[m] = rest;
        else delete next[m];
      }
    } else {
      const grant: PermissionGrant = { ...current, [action]: true };
      if (action !== "view") grant.view = true;
      next[m] = grant;
    }
  });
  return next;
}

export function isAllFullyGranted(perms: PermissionsMap, modules: readonly PermissionModule[]): boolean {
  return modules.every((m) => isModuleFullyGranted(perms, m));
}

export function toggleAllModulesInPermissions(
  perms: PermissionsMap,
  modules: readonly PermissionModule[]
): PermissionsMap {
  const allGranted = isAllFullyGranted(perms, modules);
  if (allGranted) {
    const next: PermissionsMap = { ...perms };
    modules.forEach((m) => delete next[m]);
    return next;
  }
  const next: PermissionsMap = { ...perms };
  modules.forEach((m) => {
    const grant: PermissionGrant = {};
    MODULE_ACTIONS[m].forEach((a) => {
      grant[a] = true;
    });
    next[m] = grant;
  });
  return next;
}
