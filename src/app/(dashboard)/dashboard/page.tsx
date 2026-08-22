"use client";

import React, { useEffect, useState } from "react";
import {
  ShoppingBag,
  Tag,
  Users,
  Layers,
  Bell,
  Building2,
  Package,
  AlertTriangle,
  TrendingUp,
  Plus,
  BarChart3,
  DollarSign,
  FileText,
} from "lucide-react";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  if (!user) {
    return <div className="p-6">Loading...</div>;
  }

  const isSuperAdmin = user.role === "super_admin";
  const isCompanyAdmin = user.role === "company_admin";
  const isStaff = user.role === "staff";

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
            <a href="/super-admin/create-company" className="hero-panel-link-outline">
              <Plus className="h-4 w-4" />
              Create New Company
            </a>
          </div>
        </div>
      )}

      {/* Company Admin Quick Actions */}
      {isCompanyAdmin && (
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
            <a href="/hsn" className="hero-panel-link">
              <Tag className="h-4 w-4" />
              HSN Codes
            </a>
            <a href="#" className="hero-panel-link-outline">
              <Layers className="h-4 w-4" />
              New Sale
            </a>
            <a href="#" className="hero-panel-link-outline">
              <Users className="h-4 w-4" />
              Customers
            </a>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <p className="stat-label">Today's Sales</p>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>
          <p className="stat-value">₹45,680</p>
          <p className="text-xs text-gray-500 mt-2">↑ 12% from yesterday</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <p className="stat-label">Today's Purchase</p>
            <ShoppingBag className="h-5 w-5 text-gray-400" />
          </div>
          <p className="stat-value">₹1,20,000</p>
          <p className="text-xs text-gray-500 mt-2">↑ 8% from yesterday</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <p className="stat-label">Total Items</p>
            <Package className="h-5 w-5 text-gray-400" />
          </div>
          <p className="stat-value">1,523</p>
          <p className="text-xs text-gray-500 mt-2">Active products</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <p className="stat-label">Low Stock Items</p>
            <AlertTriangle className="h-5 w-5 text-gray-400" />
          </div>
          <p className="stat-value">12</p>
          <p className="text-xs text-gray-500 mt-2">Items below reorder</p>
        </div>
      </div>

      {/* Recent Activity & Quick Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gray-100 rounded-lg">
              <BarChart3 className="h-5 w-5 text-black" />
            </div>
            <h2 className="text-lg font-bold text-black">Recent Activity</h2>
          </div>
          <div className="space-y-3">
            {[
              { type: "Sale", desc: "Invoice #SALE/24-25/00042 - Sharma Traders", amount: "₹12,500", time: "10 min ago" },
              { type: "Purchase", desc: "GRN #PUR/24-25/00018 - Postic Snacks", amount: "₹85,000", time: "1 hr ago" },
              { type: "Payment", desc: "Cash Receipt - Patel Retail", amount: "₹15,000", time: "3 hr ago" },
            ].map((activity, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg border border-gray-200">
                    <FileText className="h-4 w-4 text-gray-700" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-black">{activity.desc}</p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
                <p className="text-sm font-bold text-black">{activity.amount}</p>
              </div>
            ))}
          </div>
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
