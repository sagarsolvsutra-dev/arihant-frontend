// API Client - Provides typed methods using fetch + API_ENDPOINTS
import { toast } from "sonner";
import { API_ENDPOINTS } from "./api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function request<T = any>(
  url: string,
  options: RequestInit = {},
  showErrorToast: boolean = true
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    // Token expired or invalid - clear and redirect
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    throw new Error("Session expired. Please login again.");
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = data.message || `HTTP ${res.status}`;
    if (showErrorToast) {
      toast.error(message);
    }
    throw new Error(message);
  }
  return data;
}

export const api = {
  // Auth
  login: (payload: { email: string; password: string }) =>
    request(API_ENDPOINTS.LOGIN, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  register: (payload: any) =>
    request(API_ENDPOINTS.REGISTER, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  me: () => request(API_ENDPOINTS.ME, {}, false),
  logout: () => request(API_ENDPOINTS.LOGOUT, { method: "POST" }, false),

  // Companies
  getCompanies: () => request(API_ENDPOINTS.COMPANIES, {}, false),
  createCompany: (payload: any) =>
    request(API_ENDPOINTS.CREATE_COMPANY, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateCompany: (id: string, payload: any) =>
    request(`${API_ENDPOINTS.COMPANIES}/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteCompany: (id: string) =>
    request(`${API_ENDPOINTS.COMPANIES}/${id}`, {
      method: "DELETE",
    }),
  restoreCompany: (id: string) =>
    request(`${API_ENDPOINTS.COMPANIES}/${id}/restore`, {
      method: "PATCH",
    }),
  getInactiveCompanies: () =>
    request(`${API_ENDPOINTS.COMPANIES}?includeInactive=true`, {}, false),

  // Users
  getUsers: () => request(API_ENDPOINTS.USERS, {}, false),
  createUser: (payload: any) =>
    request(API_ENDPOINTS.USERS, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Masters
  getWarehouses: () => request(API_ENDPOINTS.WAREHNS, {}, false),
  getItems: () => request(API_ENDPOINTS.ITEMS, {}, false),
  getHSN: () => request(API_ENDPOINTS.HSN, {}, false),
  getCustomers: () => request(API_ENDPOINTS.CUSTOMERS, {}, false),
  getSuppliers: () => request(API_ENDPOINTS.SUPPLIERS, {}, false),
  getSalesmen: () => request(API_ENDPOINTS.SALESMEN, {}, false),
  getSchemes: () => request(API_ENDPOINTS.SCHEMES, {}, false),
  getItemGroups: () => request(API_ENDPOINTS.ITEM_GROUPS, {}, false),
  getBrands: () => request(API_ENDPOINTS.COMPANIES_BRANDS, {}, false),

  // Sales
  getSales: () => request(API_ENDPOINTS.SALES, {}, false),
  getSalesReturn: () => request(API_ENDPOINTS.SALES_RETURN, {}, false),

  // Purchase
  getPurchases: () => request(API_ENDPOINTS.PURCHASES, {}, false),
  getPurchaseReturn: () => request(API_ENDPOINTS.PURCHASE_RETURN, {}, false),

  // Inventory
  getStock: () => request(API_ENDPOINTS.STOCK, {}, false),
  getStockTransfer: () => request(API_ENDPOINTS.STOCK_TRANSFER, {}, false),
  getStockAdjustment: () => request(API_ENDPOINTS.STOCK_ADJUSTMENT, {}, false),
  getStockLedger: () => request(API_ENDPOINTS.STOCK_LEDGER, {}, false),

  // Accounts
  getAccounts: () => request(API_ENDPOINTS.ACCOUNTS, {}, false),
  getCashReceipt: () => request(API_ENDPOINTS.CASH_RECEIPT, {}, false),
  getCashPayment: () => request(API_ENDPOINTS.CASH_PAYMENT, {}, false),
  getBankReceipt: () => request(API_ENDPOINTS.BANK_RECEIPT, {}, false),
  getBankPayment: () => request(API_ENDPOINTS.BANK_PAYMENT, {}, false),
  getContra: () => request(API_ENDPOINTS.CONTRA, {}, false),
  getJournal: () => request(API_ENDPOINTS.JOURNAL, {}, false),

  // Reports
  getReports: () => request(API_ENDPOINTS.REPORTS, {}, false),
  getGSTR1: () => request(API_ENDPOINTS.GST_R1, {}, false),
  getGSTR3B: () => request(API_ENDPOINTS.GST_R3B, {}, false),
};

export default api;