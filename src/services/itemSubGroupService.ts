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

export const itemSubGroupService = {
  getItemSubGroups: (companyId: string, page = 1, limit = 10, search = "") => {
    return request(`${API_ENDPOINTS.ITEM_SUB_GROUPS}?companyId=${companyId}&page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
  },
  createItemSubGroup: (payload: { companyId: string; name: string; shortName?: string; itemGroupId?: string; isActive?: boolean }) => {
    return request(API_ENDPOINTS.ITEM_SUB_GROUPS, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateItemSubGroup: (id: string, payload: { name?: string; shortName?: string; itemGroupId?: string; isActive?: boolean }) => {
    return request(`${API_ENDPOINTS.ITEM_SUB_GROUPS}/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  deleteItemSubGroup: (id: string) => {
    return request(`${API_ENDPOINTS.ITEM_SUB_GROUPS}/${id}`, {
      method: "DELETE",
    });
  },
};
