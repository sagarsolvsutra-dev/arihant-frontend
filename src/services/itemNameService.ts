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

export const itemNameService = {
  createItemName: async (payload: { companyId: string; itemGroupId: string; name: string; isActive?: boolean }) => {
    return request(API_ENDPOINTS.ITEM_NAMES, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getItemNames: async (companyId: string, search = "", itemGroupId = "") => {
    let url = `${API_ENDPOINTS.ITEM_NAMES}/company/${companyId}?search=${encodeURIComponent(search)}`;
    if (itemGroupId) {
      url += `&itemGroupId=${itemGroupId}`;
    }
    return request(url);
  },

  updateItemName: async (id: string, payload: { itemGroupId?: string; name?: string; isActive?: boolean }) => {
    return request(`${API_ENDPOINTS.ITEM_NAMES}/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  deleteItemName: async (id: string) => {
    return request(`${API_ENDPOINTS.ITEM_NAMES}/${id}`, {
      method: "DELETE",
    });
  },
};
