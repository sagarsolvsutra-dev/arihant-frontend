"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  Users,
  Truck,
  ShoppingBag,
  Tag,
  RotateCcw,
  ClipboardList,
} from "lucide-react";

const REPORTS = [
  {
    href: "/reports/full-stock",
    title: "Full Report",
    subtitle: "Opening/Purchase/Sale/Closing stock per item, grouped by Supplier, with Case+Pcs and Group/Grand totals",
    icon: ClipboardList,
  },
  {
    href: "/reports/items",
    title: "Item Report",
    subtitle: "Purchased, sold, returned quantity & value per item, plus current stock",
    icon: Package,
  },
  {
    href: "/reports/customers",
    title: "Customer Report",
    subtitle: "Sale, sale return & outstanding totals per customer",
    icon: Users,
  },
  {
    href: "/reports/suppliers",
    title: "Supplier Report",
    subtitle: "Purchase, purchase return & outstanding totals per supplier",
    icon: Truck,
  },
  {
    href: "/reports/purchases",
    title: "Purchase Report",
    subtitle: "Line-by-line purchase detail with item/godown filters",
    icon: ShoppingBag,
  },
  {
    href: "/reports/sales",
    title: "Sale Report",
    subtitle: "Line-by-line sale detail with item/godown/customer filters",
    icon: Tag,
  },
  {
    href: "/reports/purchase-returns",
    title: "Purchase Return Report",
    subtitle: "Line-by-line purchase return detail, filterable by condition",
    icon: RotateCcw,
  },
  {
    href: "/reports/sale-returns",
    title: "Sale Return Report",
    subtitle: "Line-by-line sale return detail, filterable by condition",
    icon: RotateCcw,
  },
];

export default function ReportsHubPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-gray-900">Reports (રિપોર્ટ)</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          All reports are computed on the backend from live data, with date range and other filters.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORTS.map((r) => {
          const Icon = r.icon;
          return (
            <button
              key={r.href}
              onClick={() => router.push(r.href)}
              className="card p-4 text-left flex items-start gap-3 hover:border-gray-400 hover:shadow-md transition-all"
            >
              <div className="shrink-0 h-10 w-10 rounded-lg bg-gray-900 text-white flex items-center justify-center">
                <Icon size={18} />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm text-gray-900">{r.title}</div>
                <div className="text-xs text-gray-500 mt-0.5">{r.subtitle}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="card p-4 flex items-start gap-3">
        <div className="shrink-0 h-10 w-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
          <Users size={18} />
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-sm text-gray-900">Customer / Supplier Ledger</div>
          <div className="text-xs text-gray-500 mt-0.5">
            Open the ledger from the ledger icon on any row in{" "}
            <button className="text-blue-600 hover:underline" onClick={() => router.push("/customers")}>
              Customers
            </button>{" "}
            or{" "}
            <button className="text-blue-600 hover:underline" onClick={() => router.push("/suppliers")}>
              Suppliers
            </button>
            , or from the Customer / Supplier Report rows above.
          </div>
        </div>
      </div>
    </div>
  );
}
