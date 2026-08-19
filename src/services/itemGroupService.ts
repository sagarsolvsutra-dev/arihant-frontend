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

export const itemGroupService = {
  getItemGroups: (companyId: string) => {
    return request(`${API_ENDPOINTS.ITEM_GROUPS}?companyId=${companyId}`);
  },
  createItemGroup: (payload: { companyId: string; name: string; shortName?: string; commissionRate?: number; isActive?: boolean }) => {
    return request(API_ENDPOINTS.ITEM_GROUPS, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateItemGroup: (id: string, payload: { name?: string; shortName?: string; commissionRate?: number; isActive?: boolean }) => {
    return request(`${API_ENDPOINTS.ITEM_GROUPS}/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  deleteItemGroup: (id: string) => {
    return request(`${API_ENDPOINTS.ITEM_GROUPS}/${id}`, {
      method: "DELETE",
    });
  },
};
