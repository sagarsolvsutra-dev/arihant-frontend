import { API_ENDPOINTS } from "@/lib/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function request<T = any>(url: string, options: RequestInit = {}): Promise<T> {
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

function qs(params: Record<string, string | number | undefined>) {
  const parts: string[] = [];
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "") return;
    parts.push(`${key}=${encodeURIComponent(String(value))}`);
  });
  return parts.join("&");
}

export interface ReportFilters {
  companyId: string;
  page?: number;
  limit?: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  itemId?: string;
  godownId?: string;
  customerId?: string;
  supplierId?: string;
  condition?: string;
}

export const reportService = {
  getItemReport: (f: ReportFilters) =>
    request(`${API_ENDPOINTS.REPORTS}/items?${qs(f as any)}`),
  getCustomerReport: (f: ReportFilters) =>
    request(`${API_ENDPOINTS.REPORTS}/customers?${qs(f as any)}`),
  getSupplierReport: (f: ReportFilters) =>
    request(`${API_ENDPOINTS.REPORTS}/suppliers?${qs(f as any)}`),
  getPurchaseReport: (f: ReportFilters) =>
    request(`${API_ENDPOINTS.REPORTS}/purchases?${qs(f as any)}`),
  getSaleReport: (f: ReportFilters) =>
    request(`${API_ENDPOINTS.REPORTS}/sales?${qs(f as any)}`),
  getPurchaseReturnReport: (f: ReportFilters) =>
    request(`${API_ENDPOINTS.REPORTS}/purchase-returns?${qs(f as any)}`),
  getSaleReturnReport: (f: ReportFilters) =>
    request(`${API_ENDPOINTS.REPORTS}/sale-returns?${qs(f as any)}`),
  getCustomerLedger: (customerId: string, companyId: string, dateFrom = "", dateTo = "") =>
    request(`${API_ENDPOINTS.REPORTS}/customer-ledger/${customerId}?${qs({ companyId, dateFrom, dateTo })}`),
  getSupplierLedger: (supplierId: string, companyId: string, dateFrom = "", dateTo = "") =>
    request(`${API_ENDPOINTS.REPORTS}/supplier-ledger/${supplierId}?${qs({ companyId, dateFrom, dateTo })}`),

  // Excel downloads go through a plain window.open() navigation, which can't
  // carry an Authorization header — the token rides along as a query param
  // instead (the backend's `protect` middleware accepts either).
  exportReport: (resource: string, f: ReportFilters) => {
    const token = getToken();
    window.open(`${API_ENDPOINTS.REPORTS}/${resource}/export?${qs({ ...(f as any), token: token || undefined })}`, "_blank");
  },
  exportCustomerLedger: (customerId: string, companyId: string, dateFrom = "", dateTo = "") => {
    const token = getToken();
    window.open(`${API_ENDPOINTS.REPORTS}/customer-ledger/${customerId}/export?${qs({ companyId, dateFrom, dateTo, token: token || undefined })}`, "_blank");
  },
  exportSupplierLedger: (supplierId: string, companyId: string, dateFrom = "", dateTo = "") => {
    const token = getToken();
    window.open(`${API_ENDPOINTS.REPORTS}/supplier-ledger/${supplierId}/export?${qs({ companyId, dateFrom, dateTo, token: token || undefined })}`, "_blank");
  },
};
