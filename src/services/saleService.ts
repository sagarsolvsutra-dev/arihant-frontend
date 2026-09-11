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

export const saleService = {
  getSales: (companyId: string, page = 1, limit = 10, search = "", dateFrom = "", dateTo = "") => {
    const dateParams = `${dateFrom ? `&dateFrom=${dateFrom}` : ""}${dateTo ? `&dateTo=${dateTo}` : ""}`;
    return request(`${API_ENDPOINTS.SALES}?companyId=${companyId}&page=${page}&limit=${limit}&search=${encodeURIComponent(search)}${dateParams}`);
  },
  getSaleById: (id: string) => {
    return request(`${API_ENDPOINTS.SALES}/${id}`);
  },
  createSale: (payload: any) => {
    return request(API_ENDPOINTS.SALES, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateSale: (id: string, payload: any) => {
    return request(`${API_ENDPOINTS.SALES}/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  deleteSale: (id: string) => {
    return request(`${API_ENDPOINTS.SALES}/${id}`, {
      method: "DELETE",
    });
  },
};
