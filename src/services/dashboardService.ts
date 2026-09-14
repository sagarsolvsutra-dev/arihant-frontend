import { API_ENDPOINTS } from "@/lib/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function request<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers, cache: "no-store" });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || `HTTP ${res.status}`);
  }
  return data;
}

export interface DashboardActivityItem {
  type: "Sale" | "Purchase" | "PurchaseReturn" | "SaleReturn" | "StockTransfer";
  refNo: string;
  description: string | null;
  amount: number | null;
  date: string;
  id: string;
}

export interface CompanyDashboardResponse {
  role: "company_admin" | "staff";
  kpis: {
    todaySalesAmount: number;
    todaySalesCount: number;
    todayPurchasesAmount: number;
    todayPurchasesCount: number;
    totalItems: number;
    lowStockItems: number;
    totalCustomers: number;
    totalReceivable: number;
    totalPayable: number;
  };
  recentActivity: DashboardActivityItem[];
}

export interface SuperAdminDashboardResponse {
  role: "super_admin";
  kpis: {
    totalCompanies: number;
    activeCompanies: number;
    totalCompanyAdmins: number;
    totalStaff: number;
  };
  recentCompanies: { id: string; name: string; code: string; isActive: boolean; createdAt: string }[];
}

export type DashboardResponse = CompanyDashboardResponse | SuperAdminDashboardResponse;

// No params needed — server-side scopeCompany already resolves the caller's
// own company from the JWT (company_admin/staff) or serves a system-wide
// summary (super_admin), see dashboardController.js's getDashboard.
export const dashboardService = {
  getDashboard: (): Promise<DashboardResponse> => {
    return request(API_ENDPOINTS.DASHBOARD);
  },
};
