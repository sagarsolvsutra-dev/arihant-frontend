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
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { useCompany } from "@/context/CompanyContext";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { activeCompany } = useCompany();
  const pathname = usePathname();
  const router = useRouter();
  const [notificationsCount] = useState(3);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMastersOpen, setIsMastersOpen] = useState(false);
  const [sidebarView, setSidebarView] = useState<"main" | "masters">("main");
  const userMenuRef = useRef<HTMLDivElement>(null);

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

  // Automatically switch sidebar view to "masters" if the pathname matches a master page
  useEffect(() => {
    const masterPaths = ["/hsn", "/items", "/item-groups", "/item-names", "/item-sub-groups", "/customers", "/customer-groups", "/suppliers", "/supplier-groups", "/salesmans", "/schemes"];
    if (masterPaths.some(path => pathname === path || pathname?.startsWith(path))) {
      setSidebarView("masters");
    }
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

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      // Try to call backend logout (best effort)
      const token = localStorage.getItem("token");
      if (token) {
        try {
          await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/auth/logout`,
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
    // Company Admin & Staff both get Dashboard + Reports
    const baseMenu = [
      {
        id: "ca-dashboard",
        label: "ડેસ્કટોપ (Dashboard)",
        englishLabel: "Dashboard",
        icon: <LayoutDashboard className="h-5 w-5" />,
        href: "/dashboard",
      },
      {
        id: "ca-reports",
        label: "રિપોર્ટ (Reports)",
        englishLabel: "Reports",
        icon: <FileText className="h-5 w-5" />,
        href: "#",
      },
    ];

    // Company Admin gets additional modules
    if (isCompanyAdmin) {
      return [
        ...baseMenu.slice(0, 1),
        {
          id: "ca-purchase",
          label: "Purchase (ખરીદ)",
          englishLabel: "Purchase",
          icon: <ShoppingBag className="h-5 w-5" />,
          href: "#",
        },
        {
          id: "ca-sell",
          label: "Sell (વેચાણ)",
          englishLabel: "Sell",
          icon: <Tag className="h-5 w-5" />,
          href: "#",
        },
        baseMenu[1],
      ];
    }

    return baseMenu;
  };

  const menuItems = getMenuItems();

  const masterItems: any[] = [];

  const getFormattedDate = () => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    };
    return new Date().toLocaleDateString("en-GB", options);
  };

  const renderMenuItem = (item: {
    id: string;
    label: string;
    icon: React.ReactNode;
    href: string;
  }) => {
    const isActive = pathname === item.href;
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
      {/* Sidebar */}
      <aside className="w-64 sidebar flex flex-col justify-between shrink-0 overflow-hidden relative border-r border-gray-200 bg-white">
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
                <div className="flex flex-col">
                  <span className="font-bold text-sm tracking-tight text-gray-900 leading-tight">
                    {activeCompany ? activeCompany.name : "Arihant ERP"}
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium tracking-wider">
                    {isSuperAdmin ? "System Admin" : "Enterprise Hub"}
                  </span>
                </div>
              </div>

              {/* Navigation Links */}
              <nav className="flex flex-col gap-2 px-3 overflow-y-auto max-h-[calc(100vh-180px)]">
                {menuItems.map(renderMenuItem)}

                {!isSuperAdmin && (
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
              {[
                { label: "Items / M.R.Ps.", href: "/items" },
                { label: "HSN Codes", href: "/hsn" },
                { label: "Item Groups", href: "/item-groups" },
                { label: "Item Names", href: "/item-names" },
                { label: "Item Sub Groups", href: "/item-sub-groups" },
                { label: "Customers", href: "/customers" },
                { label: "Customer Groups", href: "/customer-groups" },
                { label: "Suppliers", href: "/suppliers" },
                { label: "Supplier Groups", href: "/supplier-groups" },
                { label: "Salesmans", href: "/salesmen" },
                { label: "Schemes", href: "/schemes" },
                { label: "Opening Pending Bill", href: "/opening-bills/sale" },
                { label: "Opening Pending Bill (Supp)", href: "/opening-bills/purchase" },
              ].map((sub, idx) => {
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
        <header className="h-16 bg-white border-b border-gray-150 flex items-center justify-between px-6 shrink-0">
          {/* Welcome and Date info */}
          <div className="flex flex-col">
            <h1 className="text-sm font-bold text-gray-900">
              Welcome back, {user?.name || "User"} 👋
            </h1>
            <span className="text-[10px] text-gray-500 font-medium">
              {getFormattedDate()}
            </span>
          </div>

          {/* Action icons, Company Switcher, Profile */}
          <div className="flex items-center gap-5">
            {/* Role Badge */}
            {user && (
              <span className="badge-primary">
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