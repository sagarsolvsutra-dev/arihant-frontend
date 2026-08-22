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

export const salesmanService = {
  getSalesmen: (companyId: string, page = 1, limit = 10, search = "") => {
    return request(`${API_ENDPOINTS.SALESMEN}?companyId=${companyId}&page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
  },
  createSalesman: (payload: { companyId: string; name: string; phone?: string; email?: string; isActive?: boolean }) => {
    return request(API_ENDPOINTS.SALESMEN, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateSalesman: (id: string, payload: { name?: string; phone?: string; email?: string; isActive?: boolean }) => {
    return request(`${API_ENDPOINTS.SALESMEN}/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  deleteSalesman: (id: string) => {
    return request(`${API_ENDPOINTS.SALESMEN}/${id}`, {
      method: "DELETE",
    });
  },
};
