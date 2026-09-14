"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Tag,
  Settings,
  Users,
  Layers,
  Bell,
  Building2,
  LogOut,
  ChevronDown,
  ArrowLeft,
  User as UserIcon,
  FileText,
  Menu,
  X,
  RotateCcw,
  ArrowLeftRight,
  UserCog,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { useCompany } from "@/context/CompanyContext";
import { formatDate } from "@/lib/date";
import { can, PermissionsMap, PermissionModule } from "@/lib/permissions";

interface AdminLayoutProps {
  children: React.ReactNode;
}

// Each master-data page is its own separately-grantable permission module
// now (see lib/permissions.ts's history note) — every link here is gated on
// its own moduleKey's "view" grant, not one shared "masters" flag.
const MASTER_LINKS: { label: string; href: string; moduleKey: PermissionModule }[] = [
  { label: "Suppliers", href: "/suppliers", moduleKey: "suppliers" },
  { label: "Supplier Groups", href: "/supplier-groups", moduleKey: "supplierGroups" },
  { label: "Godowns", href: "/godowns", moduleKey: "godowns" },
  { label: "Godown Groups", href: "/godown-groups", moduleKey: "godownGroups" },
  { label: "Items / M.R.Ps.", href: "/items", moduleKey: "items" },
  { label: "HSN Codes", href: "/hsn", moduleKey: "hsn" },
  { label: "Item Names", href: "/item-names", moduleKey: "itemNames" },
  { label: "Item Sub Groups", href: "/item-sub-groups", moduleKey: "itemSubGroups" },
  { label: "Customers", href: "/customers", moduleKey: "customers" },
  { label: "Customer Groups", href: "/customer-groups", moduleKey: "customerGroups" },
  { label: "Salesmans", href: "/salesmen", moduleKey: "salesmen" },
  { label: "Schemes", href: "/schemes", moduleKey: "schemes" },
  { label: "Opening Pending of Sale Bill", href: "/opening-bills/sale", moduleKey: "openingBills" },
  { label: "Opening Pending of Purchase Bill", href: "/opening-bills/purchase", moduleKey: "openingBills" },
];

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { activeCompany, companies, selectedCompanyId, setSelectedCompanyId, canSwitchCompany } = useCompany();
  const pathname = usePathname();
  const router = useRouter();
  const [notificationsCount] = useState(3);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMastersOpen, setIsMastersOpen] = useState(false);
  const [sidebarView, setSidebarView] = useState<"main" | "masters">("main");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close the mobile sidebar drawer whenever the route changes
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  // Close user menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setShowUserMenu(false);
      }
    }
    if (showUserMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showUserMenu]);

  // Keep sidebar view in sync with the current route: switch TO "masters" when the
  // pathname matches a master page, and back to "main" otherwise — the "otherwise"
  // half was previously missing, so navigating from a master page to a non-master
  // one (e.g. a Supplier's purchase-history drill-down link to /purchase/edit/:id,
  // or browser Back/Forward) left the sidebar stuck showing the Masters submenu
  // with no Dashboard/Purchase/Sell links visible.
  useEffect(() => {
    const masterPaths = ["/hsn", "/items", "/item-names", "/item-sub-groups", "/customers", "/customer-groups", "/suppliers", "/supplier-groups", "/godowns", "/godown-groups", "/salesmen", "/schemes", "/opening-bills/sale", "/opening-bills/purchase"];
    const isMasterPath = masterPaths.some(path => pathname === path || pathname?.startsWith(path));
    setSidebarView(isMasterPath ? "masters" : "main");
  }, [pathname]);

  // Read user from localStorage immediately (no useEffect delay)
  const [user, setUser] = useState<any>(() => {
    if (typeof window !== "undefined") {
      const userData = localStorage.getItem("user");
      if (userData) {
        try {
          return JSON.parse(userData);
        } catch {
          return null;
        }
      }
    }
    return null;
  });

  const isSuperAdmin = user?.role === "super_admin";
  const isCompanyAdmin = user?.role === "company_admin";
  const isStaff = user?.role === "staff";

  // Only meaningful for staff — company_admin always has full access
  // regardless of what (if anything) is granted here. See CLAUDE.md's
  // Staff & Permissions section / lib/permissions.ts for the canonical
  // module list + per-module CRUD shape this must stay in sync with.
  // Nav visibility is driven by "view" specifically — a staff member with
  // e.g. sale.create but not sale.view still needs to be ABLE to open Sale
  // to use that create permission, so "view" is really "can open this
  // module's pages at all," not a narrower read-only distinction here.
  const permissions: PermissionsMap = user?.permissions || {};
  const hasPermission = (key: PermissionModule) => isCompanyAdmin || can(permissions, key, "view");
  // Gates the Masters toggle button itself — shown if ANY master-data module
  // is viewable, even though each individual link inside is gated on its own
  // moduleKey (see MASTER_LINKS.filter above).
  const hasAnyMasterPermission = isCompanyAdmin || MASTER_LINKS.some((l) => hasPermission(l.moduleKey));

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      // Try to call backend logout (best effort)
      const token = localStorage.getItem("token");
      if (token) {
        try {
          await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/auth/logout`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            }
          );
        } catch {
          // Continue with client-side logout even if backend fails
        }
      }

      // Clear all client-side state
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("selectedCompanyId");

      toast.success("Logged out successfully");
      setConfirmLogout(false);

      // Force full reload to clear all state
      setTimeout(() => {
        window.location.href = "/login";
      }, 300);
    } catch (err) {
      toast.error("Logout failed");
      setLoggingOut(false);
    }
  };

  const getMenuItems = () => {
    if (isSuperAdmin) {
      return [
        {
          id: "sa-dashboard",
          label: "ડેસ્કટોપ (Dashboard)",
          englishLabel: "Dashboard",
          icon: <LayoutDashboard className="h-5 w-5" />,
          href: "/dashboard",
        },
        {
          id: "sa-companies",
          label: "કંપનીઓ (Companies)",
          englishLabel: "Companies",
          icon: <Building2 className="h-5 w-5" />,
          href: "/super-admin/companies",
        },
        {
          id: "sa-users",
          label: "યુઝર્સ (Users)",
          englishLabel: "Users",
          icon: <Users className="h-5 w-5" />,
          href: "/super-admin/users",
        },
      ];
    }
    // Company Admin always sees every module (hasPermission short-circuits
    // true for them); Staff only sees the modules they've actually been
    // granted — built dynamically from `permissions` instead of the old
    // hardcoded "staff gets Dashboard+Reports only, nothing else" menu.
    const items = [
      {
        id: "ca-dashboard",
        label: "ડેસ્કટોપ (Dashboard)",
        englishLabel: "Dashboard",
        icon: <LayoutDashboard className="h-5 w-5" />,
        href: "/dashboard",
      },
    ];

    if (hasPermission("purchase")) {
      items.push({
        id: "ca-purchase",
        label: "Purchase (ખરીદ)",
        englishLabel: "Purchase",
        icon: <ShoppingBag className="h-5 w-5" />,
        href: "/purchase",
      });
    }
    if (hasPermission("sale")) {
      items.push({
        id: "ca-sell",
        label: "Sell (વેચાણ)",
        englishLabel: "Sell",
        icon: <Tag className="h-5 w-5" />,
        href: "/sale",
      });
    }
    if (hasPermission("purchaseReturn")) {
      items.push({
        id: "ca-purchase-return",
        label: "Purchase Return",
        englishLabel: "Purchase Return",
        icon: <RotateCcw className="h-5 w-5" />,
        href: "/purchase-return",
      });
    }
    if (hasPermission("saleReturn")) {
      items.push({
        id: "ca-sale-return",
        label: "Sale Return",
        englishLabel: "Sale Return",
        icon: <RotateCcw className="h-5 w-5" />,
        href: "/sale-return",
      });
    }
    if (hasPermission("stockTransfer")) {
      items.push({
        id: "ca-stock-transfer",
        label: "Stock Transfer",
        englishLabel: "Stock Transfer",
        icon: <ArrowLeftRight className="h-5 w-5" />,
        href: "/stock-transfer",
      });
    }
    if (hasPermission("reports")) {
      items.push({
        id: "ca-reports",
        label: "રિપોર્ટ (Reports)",
        englishLabel: "Reports",
        icon: <FileText className="h-5 w-5" />,
        href: "/reports",
      });
    }
    // Staff management is a company_admin-only capability, not a
    // permission a company_admin can grant to staff — a staff member can
    // never create/manage other staff, regardless of their permissions.
    if (isCompanyAdmin) {
      items.push({
        id: "ca-staff",
        label: "સ્ટાફ (Staff)",
        englishLabel: "Staff",
        icon: <UserCog className="h-5 w-5" />,
        href: "/staff",
      });
    }

    return items;
  };

  const menuItems = getMenuItems();

  const masterItems: any[] = [];

  const getFormattedDate = () => {
    return formatDate(new Date());
  };

  const renderMenuItem = (item: {
    id: string;
    label: string;
    icon: React.ReactNode;
    href: string;
  }) => {
    const isActive = pathname === item.href || (item.href !== "/" && item.href !== "#" && pathname?.startsWith(`${item.href}/`));
    return (
      <Link
        key={item.id}
        href={item.href}
        className={`w-full py-2 px-3 rounded-lg text-xs font-semibold text-center border transition-all duration-200 ${isActive
          ? "bg-black text-white border-black font-bold"
          : "bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300/80 hover:border-gray-450 font-semibold"
          }`}
      >
        {item.label}
      </Link>
    );
  };

  return (
    <div className="flex h-screen bg-[#fafafa] overflow-hidden text-gray-800 font-sans">
      {/* Mobile sidebar backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`w-64 sidebar flex flex-col justify-between shrink-0 overflow-hidden border-r border-gray-200 bg-white
          fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out
          lg:static lg:translate-x-0
          ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Mobile-only close button */}
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(false)}
          className="lg:hidden absolute top-3 right-3 z-10 p-1.5 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex-1 relative w-full overflow-hidden">
          {/* Main Menu Panel */}
          <div
            className={`absolute inset-0 flex flex-col justify-between pb-4 transition-all duration-300 ease-in-out ${sidebarView === "main"
              ? "translate-x-0 opacity-100 pointer-events-auto"
              : "-translate-x-full opacity-0 pointer-events-none"
              }`}
          >
            <div className="flex flex-col gap-6 py-5">
              {/* Logo Section */}
              <div className="px-5 flex items-center gap-3">
                <div className="h-10 w-10 bg-black text-white font-bold rounded-full flex items-center justify-center text-lg">
                  AE
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  {canSwitchCompany && companies.length > 1 ? (
                    // Only a super_admin (canSwitchCompany) ever gets more than one
                    // company to choose from — company_admin/staff are always locked
                    // to their own. Previously nothing in the app ever called
                    // setSelectedCompanyId, so a super_admin had no way to pick which
                    // company's data they were viewing/editing at all.
                    <select
                      value={selectedCompanyId}
                      onChange={(e) => setSelectedCompanyId(e.target.value)}
                      className="font-bold text-xs tracking-tight text-gray-900 leading-tight bg-transparent border-none outline-none cursor-pointer max-w-full truncate -ml-0.5"
                      title="Switch company"
                    >
                      {companies.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="font-bold text-sm tracking-tight text-gray-900 leading-tight truncate">
                      {activeCompany ? activeCompany.name : "Arihant ERP"}
                    </span>
                  )}
                  <span className="text-[10px] text-gray-400 font-medium tracking-wider">
                    {isSuperAdmin ? "System Admin" : "Enterprise Hub"}
                  </span>
                </div>
              </div>

              {/* Navigation Links */}
              <nav className="flex flex-col gap-2 px-3 overflow-y-auto max-h-[calc(100vh-180px)]">
                {menuItems.map(renderMenuItem)}

                {!isSuperAdmin && hasAnyMasterPermission && (
                  <button
                    type="button"
                    onClick={() => setSidebarView("masters")}
                    className="w-full py-2 px-3 rounded-lg text-xs font-semibold text-center border transition-all duration-205 cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300/80 hover:border-gray-450"
                  >
                    માસ્ટર્સ (Masters)
                  </button>
                )}
              </nav>
            </div>

            {/* Settings Footer inside Main Menu Panel */}
            <div className="p-3 border-t border-gray-100 mt-auto">
              <Link
                href="#"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-900 hover:text-black hover:bg-gray-100/70 font-semibold transition-colors"
              >
                <Settings className="h-5 w-5 text-gray-500" />
                <span className="font-semibold">સેટિંગ્સ (Settings)</span>
              </Link>
            </div>
          </div>

          {/* Masters Panel */}
          <div
            className={`absolute inset-0 flex flex-col overflow-hidden bg-white transition-all duration-300 ease-in-out ${sidebarView === "masters"
              ? "translate-x-0 opacity-100 pointer-events-auto"
              : "translate-x-full opacity-0 pointer-events-none"
              }`}
          >
            {/* Masters Dark Header */}
            <div className="bg-gray-900 text-white flex items-center gap-3 px-4 py-4 shrink-0">
              <button
                type="button"
                onClick={() => setSidebarView("main")}
                className="p-1 hover:bg-gray-800 rounded-full transition-colors cursor-pointer text-white flex items-center justify-center"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <span className="font-bold text-base tracking-wide">Masters</span>
            </div>

            {/* Masters Sub-menu list styled as screenshot */}
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2 bg-[#f9fafb]">
              {MASTER_LINKS.filter((sub) => hasPermission(sub.moduleKey)).map((sub, idx) => {
                const isSubActive = pathname === sub.href || pathname.startsWith(`${sub.href}/`);
                return (
                  <Link
                    key={idx}
                    href={sub.href}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-semibold text-center border transition-all duration-150 ${isSubActive
                      ? "bg-black text-white border-black"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300/80 hover:border-gray-450"
                      }`}
                  >
                    {sub.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-150 flex items-center justify-between px-3 sm:px-6 shrink-0 gap-2 sticky top-0 z-30">
          {/* Hamburger (mobile only) + Welcome/Date info */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden shrink-0 p-1.5 -ml-1 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex flex-col min-w-0">
              <h1 className="text-sm font-bold text-gray-900 truncate">
                Welcome back, {user?.name || "User"} 👋
              </h1>
              <span className="hidden sm:block text-[10px] text-gray-500 font-medium">
                {getFormattedDate()}
              </span>
            </div>
          </div>

          {/* Action icons, Company Switcher, Profile */}
          <div className="flex items-center gap-2 sm:gap-5 shrink-0">
            {/* Role Badge */}
            {user && (
              <span className="badge-primary hidden sm:inline-flex">
                {isSuperAdmin && " Super Admin"}
                {isCompanyAdmin && "Company Admin"}
                {isStaff && "Staff"}
              </span>
            )}

            {/* Role Badge */}

            {/* Notification bell */}
            <button className="relative p-1.5 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-900 transition-colors">
              <Bell className="h-5 w-5" />
              {notificationsCount > 0 && (
                <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-600 rounded-full border-2 border-white animate-pulse" />
              )}
            </button>

            {/* Profile Avatar with Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded-lg text-gray-600 hover:text-gray-950 transition-colors group"
              >
                <div className="h-9 w-9 bg-black text-white font-bold text-xs rounded-full flex items-center justify-center shadow-sm">
                  {(user?.name || "AD").charAt(0).toUpperCase()}
                </div>
                <div className="hidden md:flex flex-col leading-none text-left">
                  <span className="text-xs font-bold text-gray-950">
                    {user?.name || "User"}
                  </span>
                  <span className="text-[9px] text-gray-500 mt-0.5">
                    {isSuperAdmin ? "System Owner" : "Company User"}
                  </span>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-gray-400 transition-transform ${showUserMenu ? "rotate-180" : ""
                    }`}
                />
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-fadeIn">
                  {/* User info card */}
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 bg-black text-white font-bold text-sm rounded-full flex items-center justify-center">
                        {(user?.name || "AD").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">
                          {user?.name || "User"}
                        </div>
                        <div className="text-[10px] text-gray-500 truncate">
                          {user?.email || ""}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Settings */}
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      router.push("/settings");
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Settings className="h-4 w-4 text-gray-500" />
                    <div className="flex flex-col items-start leading-tight">
                      <span className="font-medium">સેટિંગ્સ (Settings)</span>
                      <span className="text-[10px] text-gray-400">
                        Application Settings
                      </span>
                    </div>
                  </button>

                  {/* Logout */}
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      setConfirmLogout(true);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 transition-colors border-t border-gray-100"
                  >
                    <LogOut className="h-4 w-4 text-red-500" />
                    <div className="flex flex-col items-start leading-tight">
                      <span className="font-medium text-red-600">
                        લોગઆઉટ (Logout)
                      </span>
                      <span className="text-[10px] text-gray-400">
                        Sign out securely
                      </span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Child Workspace wrapper */}
        <main className="flex-1 overflow-y-auto p-4 bg-[#fafafa]">
          {children}
        </main>
      </div>

      {/* Logout Confirmation */}
      <ConfirmationDialog
        isOpen={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        onConfirm={handleLogout}
        title="Sign out"
        message={`Are you sure you want to end your session${activeCompany ? ` from ${activeCompany.name}` : ""
          }? You'll need to log in again to access the dashboard.`}
        confirmText="Sign out"
        cancelText="Stay signed in"
        variant="danger"
        isLoading={loggingOut}
        userName={user?.name}
        userEmail={user?.email}
      />
    </div>
  );
};
