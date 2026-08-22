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

export const schemeService = {
  getSchemes: (companyId: string, page = 1, limit = 10, search = "") => {
    return request(`${API_ENDPOINTS.SCHEMES}?companyId=${companyId}&page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
  },
  createScheme: (payload: { companyId: string; itemGroupId?: string; customerId?: string; lessPercentage?: number; cdPercentage?: number }) => {
    return request(API_ENDPOINTS.SCHEMES, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateScheme: (id: string, payload: { itemGroupId?: string; customerId?: string; lessPercentage?: number; cdPercentage?: number }) => {
    return request(`${API_ENDPOINTS.SCHEMES}/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  deleteScheme: (id: string) => {
    return request(`${API_ENDPOINTS.SCHEMES}/${id}`, {
      method: "DELETE",
    });
  },
};
