"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Tag,
  Users,
  Bell,
  Building2,
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Plus,
  BarChart3,
  RotateCcw,
  Undo2,
  ArrowLeftRight,
  Wallet,
  UserCog,
} from "lucide-react";
import { dashboardService, DashboardResponse, DashboardActivityItem } from "@/services/dashboardService";
import { canAction } from "@/lib/permissions";
import { toast } from "@/lib/toast";

function formatCurrency(value: number): string {
  return `₹${(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

// Small, page-local relative-time formatter for the Recent Activity feed —
// "Recent Activity" specifically calls for relative time ("10 min ago"), not
// the absolute dd/mm/yyyy lib/date.ts's formatDate() gives everywhere else,
// so this is deliberately not routed through that shared helper.
function timeAgo(dateStr: string): string {
  const then = new Date(dateStr).getTime();
  if (isNaN(then)) return "-";
  const diffMs = Date.now() - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB");
}

const ACTIVITY_META: Record<
  DashboardActivityItem["type"],
  { label: string; icon: React.ElementType; href: string; color: string }
> = {
  Sale: { label: "Sale", icon: TrendingUp, href: "/sale/edit", color: "text-green-600 bg-green-50" },
  Purchase: { label: "Purchase", icon: ShoppingBag, href: "/purchase/edit", color: "text-blue-600 bg-blue-50" },
  PurchaseReturn: { label: "Purchase Return", icon: RotateCcw, href: "/purchase-return/edit", color: "text-amber-600 bg-amber-50" },
  SaleReturn: { label: "Sale Return", icon: Undo2, href: "/sale-return/edit", color: "text-orange-600 bg-orange-50" },
  StockTransfer: { label: "Stock Transfer", icon: ArrowLeftRight, href: "/stock-transfer/edit", color: "text-purple-600 bg-purple-50" },
};

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setIsLoading(true);
    dashboardService
      .getDashboard()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((e: any) => {
        if (!cancelled) toast.error(e.message || "Failed to load dashboard");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) {
    return <div className="p-6">Loading...</div>;
  }

  const isSuperAdmin = user.role === "super_admin";
  const isCompanyAdmin = user.role === "company_admin";
  const isStaff = user.role === "staff";

  const companyData = data && data.role !== "super_admin" ? data : null;
  const superAdminData = data && data.role === "super_admin" ? data : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-black">
          Welcome, {user.name}! 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {isSuperAdmin && "System-wide Management Dashboard"}
          {isCompanyAdmin && `${user.companyName || "Your Company"} Dashboard`}
          {isStaff && `Staff Dashboard - ${user.companyName}`}
        </p>
      </div>

      {/* Super Admin Panel - Hero */}
      {isSuperAdmin && (
        <div className="hero-panel">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-white/10 rounded-lg">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Super Admin Panel</h2>
              <p className="text-gray-300 text-sm mt-1">
                System-wide management - Create companies, admins, and monitor all operations
              </p>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap mt-4">
            <a href="/super-admin/companies" className="hero-panel-link">
              <Building2 className="h-4 w-4" />
              Manage Companies
            </a>
            <a href="/super-admin/users" className="hero-panel-link-outline">
              <Users className="h-4 w-4" />
              Manage Users
            </a>
            <a href="/super-admin/companies" className="hero-panel-link-outline">
              <Plus className="h-4 w-4" />
              Create New Company
            </a>
          </div>
        </div>
      )}

      {/* Company Admin / Staff Quick Actions */}
      {!isSuperAdmin && (
        <div className="hero-panel">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-white/10 rounded-lg">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{user.companyName}</h2>
              <p className="text-gray-300 text-sm mt-1">
                Manage your company - Staff, Items, Customers, Sales & More
              </p>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap mt-4">
            {canAction("sale", "create") && (
              <a href="/sale/add" className="hero-panel-link">
                <TrendingUp className="h-4 w-4" />
                New Sale
              </a>
            )}
            {canAction("customers", "view") && (
              <a href="/customers" className="hero-panel-link-outline">
                <Users className="h-4 w-4" />
                Customers
              </a>
            )}
            {canAction("hsn", "view") && (
              <a href="/hsn" className="hero-panel-link-outline">
                <Tag className="h-4 w-4" />
                HSN Codes
              </a>
            )}
            {isCompanyAdmin && (
              <a href="/staff" className="hero-panel-link-outline">
                <UserCog className="h-4 w-4" />
                Staff
              </a>
            )}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {isSuperAdmin ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <p className="stat-label">Total Companies</p>
              <Building2 className="h-5 w-5 text-gray-400" />
            </div>
            <p className="stat-value">{isLoading ? "—" : superAdminData?.kpis.totalCompanies ?? 0}</p>
            <p className="text-xs text-gray-500 mt-2">
              {isLoading ? " " : `${superAdminData?.kpis.activeCompanies ?? 0} active`}
            </p>
          </div>
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <p className="stat-label">Company Admins</p>
              <UserCog className="h-5 w-5 text-gray-400" />
            </div>
            <p className="stat-value">{isLoading ? "—" : superAdminData?.kpis.totalCompanyAdmins ?? 0}</p>
            <p className="text-xs text-gray-500 mt-2">Across all companies</p>
          </div>
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <p className="stat-label">Staff Accounts</p>
              <Users className="h-5 w-5 text-gray-400" />
            </div>
            <p className="stat-value">{isLoading ? "—" : superAdminData?.kpis.totalStaff ?? 0}</p>
            <p className="text-xs text-gray-500 mt-2">Across all companies</p>
          </div>
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <p className="stat-label">Inactive Companies</p>
              <AlertTriangle className="h-5 w-5 text-gray-400" />
            </div>
            <p className="stat-value">
              {isLoading
                ? "—"
                : (superAdminData?.kpis.totalCompanies ?? 0) - (superAdminData?.kpis.activeCompanies ?? 0)}
            </p>
            <p className="text-xs text-gray-500 mt-2">Need attention</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <p className="stat-label">Today's Sales</p>
              <TrendingUp className="h-5 w-5 text-gray-400" />
            </div>
            <p className="stat-value">{isLoading ? "—" : formatCurrency(companyData?.kpis.todaySalesAmount ?? 0)}</p>
            <p className="text-xs text-gray-500 mt-2">
              {isLoading ? " " : `${companyData?.kpis.todaySalesCount ?? 0} invoice(s) today`}
            </p>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between">
              <p className="stat-label">Today's Purchase</p>
              <ShoppingBag className="h-5 w-5 text-gray-400" />
            </div>
            <p className="stat-value">{isLoading ? "—" : formatCurrency(companyData?.kpis.todayPurchasesAmount ?? 0)}</p>
            <p className="text-xs text-gray-500 mt-2">
              {isLoading ? " " : `${companyData?.kpis.todayPurchasesCount ?? 0} invoice(s) today`}
            </p>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between">
              <p className="stat-label">Total Items</p>
              <Package className="h-5 w-5 text-gray-400" />
            </div>
            <p className="stat-value">{isLoading ? "—" : companyData?.kpis.totalItems ?? 0}</p>
            <p className={`text-xs mt-2 ${!isLoading && (companyData?.kpis.lowStockItems ?? 0) > 0 ? "text-amber-600 font-semibold" : "text-gray-500"}`}>
              {isLoading ? " " : `${companyData?.kpis.lowStockItems ?? 0} below reorder level`}
            </p>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between">
              <p className="stat-label">Total Customers</p>
              <Users className="h-5 w-5 text-gray-400" />
            </div>
            <p className="stat-value">{isLoading ? "—" : companyData?.kpis.totalCustomers ?? 0}</p>
            <p className="text-xs text-gray-500 mt-2">Active customers</p>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between">
              <p className="stat-label">Receivable</p>
              <Wallet className="h-5 w-5 text-gray-400" />
            </div>
            <p className="stat-value">{isLoading ? "—" : formatCurrency(companyData?.kpis.totalReceivable ?? 0)}</p>
            <p className="text-xs text-gray-500 mt-2">Pending from customers</p>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between">
              <p className="stat-label">Payable</p>
              <TrendingDown className="h-5 w-5 text-gray-400" />
            </div>
            <p className="stat-value">{isLoading ? "—" : formatCurrency(companyData?.kpis.totalPayable ?? 0)}</p>
            <p className="text-xs text-gray-500 mt-2">Pending to suppliers</p>
          </div>
        </div>
      )}

      {/* Recent Activity & Quick Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity / Recent Companies */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gray-100 rounded-lg">
              <BarChart3 className="h-5 w-5 text-black" />
            </div>
            <h2 className="text-lg font-bold text-black">
              {isSuperAdmin ? "Recently Created Companies" : "Recent Activity"}
            </h2>
          </div>

          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-lg bg-gray-100 animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading && isSuperAdmin && (
            <div className="space-y-3">
              {(superAdminData?.recentCompanies?.length ?? 0) === 0 && (
                <p className="text-sm text-gray-400">No companies yet.</p>
              )}
              {superAdminData?.recentCompanies.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg border border-gray-200">
                      <Building2 className="h-4 w-4 text-gray-700" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-black">
                        {c.name} <span className="text-xs text-gray-400">({c.code})</span>
                      </p>
                      <p className="text-xs text-gray-500">{timeAgo(c.createdAt)}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${c.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                    {c.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              ))}
            </div>
          )}

          {!isLoading && !isSuperAdmin && (
            <div className="space-y-3">
              {(companyData?.recentActivity?.length ?? 0) === 0 && (
                <p className="text-sm text-gray-400">No activity yet — transactions you create will show up here.</p>
              )}
              {companyData?.recentActivity.map((activity) => {
                const meta = ACTIVITY_META[activity.type];
                const Icon = meta.icon;
                return (
                  <Link
                    key={`${activity.type}-${activity.id}`}
                    href={`${meta.href}/${activity.id}`}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-lg border border-gray-200 ${meta.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-black truncate">
                          {meta.label} #{activity.refNo}
                          {activity.description ? ` — ${activity.description}` : ""}
                        </p>
                        <p className="text-xs text-gray-500">{timeAgo(activity.date)}</p>
                      </div>
                    </div>
                    {activity.amount !== null && (
                      <p className="text-sm font-bold text-black shrink-0 ml-2">{formatCurrency(activity.amount)}</p>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Info / Notifications */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Bell className="h-5 w-5 text-black" />
            </div>
            <h2 className="text-lg font-bold text-black">
              {isSuperAdmin ? "System Overview" : "Welcome"}
            </h2>
          </div>

          {isSuperAdmin ? (
            <div className="space-y-3 text-gray-700">
              <div className="flex items-start gap-2">
                <span className="mt-1">✅</span>
                <span>You have full access to manage all companies and users.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-1">📋</span>
                <span>Use the panel above to create new companies and assign company admins.</span>
              </div>
              {!isLoading && (superAdminData?.kpis.totalCompanies ?? 0) - (superAdminData?.kpis.activeCompanies ?? 0) > 0 && (
                <div className="flex items-start gap-2">
                  <span className="mt-1">⚠️</span>
                  <span>
                    {(superAdminData?.kpis.totalCompanies ?? 0) - (superAdminData?.kpis.activeCompanies ?? 0)} compan
                    {(superAdminData?.kpis.totalCompanies ?? 0) - (superAdminData?.kpis.activeCompanies ?? 0) === 1 ? "y is" : "ies are"} currently inactive.
                  </span>
                </div>
              )}
              <div className="flex items-start gap-2">
                <span className="mt-1">👀</span>
                <span>Monitor all activity across the entire Arihant Enterprise ERP system.</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-gray-700">
              <div className="flex items-start gap-2">
                <span className="mt-1">✅</span>
                <span>Logged in as <strong>{user.name}</strong></span>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-1">🏢</span>
                <span>Company: <strong>{user.companyName}</strong></span>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-1">📧</span>
                <span>Email: <strong>{user.email}</strong></span>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-1">📱</span>
                <span>Phone: <strong>{user.phone || "Not provided"}</strong></span>
              </div>
              {!isLoading && (companyData?.kpis.lowStockItems ?? 0) > 0 && (
                <div className="flex items-start gap-2 text-amber-700">
                  <span className="mt-1">⚠️</span>
                  <span>
                    <strong>{companyData?.kpis.lowStockItems}</strong> item(s) are at or below their reorder level.{" "}
                    {canAction("items", "view") && (
                      <Link href="/items" className="underline font-semibold">
                        Review items
                      </Link>
                    )}
                  </span>
                </div>
              )}
              <p className="text-sm text-gray-500 pt-2 border-t border-gray-100">
                Use the sidebar to navigate to different modules.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
