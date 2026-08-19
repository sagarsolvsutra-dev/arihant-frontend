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

export const customerGroupService = {
  getCustomerGroups: (companyId: string) => {
    return request(`${API_ENDPOINTS.CUSTOMER_GROUPS}?companyId=${companyId}`);
  },
  createCustomerGroup: (payload: { companyId: string; name: string; zoneNo?: string }) => {
    return request(API_ENDPOINTS.CUSTOMER_GROUPS, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateCustomerGroup: (id: string, payload: { name?: string; zoneNo?: string }) => {
    return request(`${API_ENDPOINTS.CUSTOMER_GROUPS}/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  deleteCustomerGroup: (id: string) => {
    return request(`${API_ENDPOINTS.CUSTOMER_GROUPS}/${id}`, {
      method: "DELETE",
    });
  },
};
