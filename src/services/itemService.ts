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

export const itemService = {
  getItems: (companyId: string, page = 1, limit = 10, search = "") => {
    return request(`${API_ENDPOINTS.ITEMS}?companyId=${companyId}&page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
  },
  createItem: (payload: any) => {
    return request(API_ENDPOINTS.ITEMS, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateItem: (id: string, payload: any) => {
    return request(`${API_ENDPOINTS.ITEMS}/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  deleteItem: (id: string) => {
    return request(`${API_ENDPOINTS.ITEMS}/${id}`, {
      method: "DELETE",
    });
  },
};
