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

export const supplierService = {
  getSuppliers: (companyId: string, page = 1, limit = 10, search = "") => {
    return request(`${API_ENDPOINTS.SUPPLIERS}?companyId=${companyId}&page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
  },
  createSupplier: (payload: any) => {
    return request(API_ENDPOINTS.SUPPLIERS, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateSupplier: (id: string, payload: any) => {
    return request(`${API_ENDPOINTS.SUPPLIERS}/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  deleteSupplier: (id: string) => {
    return request(`${API_ENDPOINTS.SUPPLIERS}/${id}`, {
      method: "DELETE",
    });
  },
};
